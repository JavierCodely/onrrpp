-- Migration: 073 - Add Payment Method Fields to ventas_mesas
-- Description: Add metodo_pago, monto_efectivo, monto_transferencia to ventas_mesas, matching the ventas table pattern
-- Dependencies: 064_create_mesas_ventas.sql, 066_create_mesas_functions.sql, 070_encrypt_cliente_dni.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-31
DROP VIEW IF EXISTS public.ventas_mesas_decrypted;  
-- ============================================
-- SECTION 1: Add Payment Method Columns
-- ============================================
DROP FUNCTION IF EXISTS public.vender_mesa(uuid, text, text, text, decimal);                                                                                                                                          
                                                                               
-- Add metodo_pago column (reuse existing enum from ventas table)
ALTER TABLE public.ventas_mesas
ADD COLUMN IF NOT EXISTS metodo_pago metodo_pago_type NOT NULL DEFAULT 'efectivo';

-- Add split payment columns
ALTER TABLE public.ventas_mesas
ADD COLUMN IF NOT EXISTS monto_efectivo DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.ventas_mesas
ADD COLUMN IF NOT EXISTS monto_transferencia DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add column comments
COMMENT ON COLUMN public.ventas_mesas.metodo_pago IS 'Metodo de pago: efectivo, transferencia, o mixto';
COMMENT ON COLUMN public.ventas_mesas.monto_efectivo IS 'Monto pagado en efectivo';
COMMENT ON COLUMN public.ventas_mesas.monto_transferencia IS 'Monto pagado por transferencia';

-- ============================================
-- SECTION 2: Migrate Existing Data
-- ============================================

-- For existing records: default to 'efectivo' and set monto_efectivo = precio_venta
-- (Since no payment method was previously tracked)
UPDATE public.ventas_mesas
SET
    metodo_pago = 'efectivo',
    monto_efectivo = precio_venta,
    monto_transferencia = 0
WHERE monto_efectivo = 0 AND monto_transferencia = 0;

-- ============================================
-- SECTION 3: Add Validation Constraints
-- ============================================

-- Add check constraints for payment amounts
ALTER TABLE public.ventas_mesas
ADD CONSTRAINT monto_efectivo_valido CHECK (monto_efectivo >= 0);

ALTER TABLE public.ventas_mesas
ADD CONSTRAINT monto_transferencia_valido CHECK (monto_transferencia >= 0);

ALTER TABLE public.ventas_mesas
ADD CONSTRAINT suma_montos_valida CHECK (monto_efectivo + monto_transferencia = precio_venta);

-- ============================================
-- SECTION 4: Update Validation Trigger
-- ============================================

-- Update validate_venta_mesa() to include payment validation
CREATE OR REPLACE FUNCTION validate_venta_mesa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rrpp_club UUID;
    v_evento_club UUID;
BEGIN
    -- Validate RRPP exists, has rol RRPP, and belongs to same club
    SELECT uuid_club INTO v_rrpp_club
    FROM public.personal
    WHERE id = NEW.id_rrpp
    AND rol = 'rrpp'
    AND activo = true;

    IF v_rrpp_club IS NULL THEN
        RAISE EXCEPTION 'El RRPP especificado no existe, no tiene rol RRPP, o esta inactivo';
    END IF;

    IF v_rrpp_club != NEW.uuid_club THEN
        RAISE EXCEPTION 'El RRPP debe pertenecer al mismo club';
    END IF;

    -- Validate evento belongs to same club
    SELECT uuid_club INTO v_evento_club
    FROM public.eventos
    WHERE id = NEW.uuid_evento;

    IF v_evento_club != NEW.uuid_club THEN
        RAISE EXCEPTION 'El evento debe pertenecer al mismo club';
    END IF;

    -- Calculate comision_calculada based on tipo
    IF NEW.comision_tipo = 'monto' THEN
        NEW.comision_calculada := NEW.comision_rrpp_monto;
    ELSIF NEW.comision_tipo = 'porcentaje' THEN
        NEW.comision_calculada := (NEW.precio_venta * NEW.comision_rrpp_porcentaje / 100);
    ELSE
        RAISE EXCEPTION 'Tipo de comision invalido';
    END IF;

    -- Validate payment amounts based on payment method
    CASE NEW.metodo_pago
        WHEN 'efectivo' THEN
            IF NEW.monto_efectivo != NEW.precio_venta OR NEW.monto_transferencia != 0 THEN
                RAISE EXCEPTION 'Para pago en efectivo: monto_efectivo debe ser igual a precio_venta y monto_transferencia debe ser 0';
            END IF;
        WHEN 'transferencia' THEN
            IF NEW.monto_transferencia != NEW.precio_venta OR NEW.monto_efectivo != 0 THEN
                RAISE EXCEPTION 'Para pago en transferencia: monto_transferencia debe ser igual a precio_venta y monto_efectivo debe ser 0';
            END IF;
        WHEN 'mixto' THEN
            IF NEW.monto_efectivo = 0 OR NEW.monto_transferencia = 0 THEN
                RAISE EXCEPTION 'Para pago mixto: tanto monto_efectivo como monto_transferencia deben ser mayores a 0';
            END IF;
            IF NEW.monto_efectivo + NEW.monto_transferencia != NEW.precio_venta THEN
                RAISE EXCEPTION 'Para pago mixto: la suma de monto_efectivo y monto_transferencia debe ser igual a precio_venta';
            END IF;
    END CASE;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_venta_mesa IS 'Calcula la comision, valida relaciones de club, y valida montos de pago para ventas de mesas';

-- ============================================
-- SECTION 5: Update vender_mesa Function
-- ============================================

-- Recreate vender_mesa with new payment parameters
CREATE OR REPLACE FUNCTION public.vender_mesa(
    p_uuid_mesa UUID,
    p_cliente_dni TEXT,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_cliente_email TEXT DEFAULT NULL,
    p_precio_venta DECIMAL DEFAULT NULL,
    p_metodo_pago TEXT DEFAULT 'efectivo',
    p_monto_efectivo DECIMAL DEFAULT 0,
    p_monto_transferencia DECIMAL DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_mesa RECORD;
    v_qr_code TEXT;
    v_venta_id UUID;
    v_precio_final DECIMAL;
    v_metodo_pago_enum metodo_pago_type;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club INTO v_user_role, v_user_club
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'rrpp' THEN
        RETURN json_build_object('success', false, 'error', 'Solo RRPP puede vender mesas');
    END IF;

    -- Get mesa
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = p_uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check club match
    IF v_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Check if mesa is libre or reservado by this RRPP
    IF v_mesa.estado = 'vendido' THEN
        RETURN json_build_object('success', false, 'error', 'La mesa ya esta vendida');
    END IF;

    IF v_mesa.estado = 'reservado' AND v_mesa.id_rrpp != v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'La mesa esta reservada por otro RRPP');
    END IF;

    -- Validate comision is configured
    IF v_mesa.comision_tipo IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La mesa no tiene comision configurada. Contacte al administrador.');
    END IF;

    -- Use provided price or default mesa price
    v_precio_final := COALESCE(p_precio_venta, v_mesa.precio);

    -- Cast metodo_pago to enum
    v_metodo_pago_enum := p_metodo_pago::metodo_pago_type;

    -- Generate QR code (format: MESA-{uuid_mesa}-{timestamp})
    v_qr_code := 'MESA-' || p_uuid_mesa::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;

    -- Create venta (trigger will update mesa estado to vendido and validate payment amounts)
    INSERT INTO public.ventas_mesas (
        uuid_mesa,
        uuid_evento,
        uuid_club,
        id_rrpp,
        cliente_dni,
        cliente_nombre,
        cliente_email,
        precio_venta,
        comision_tipo,
        comision_rrpp_monto,
        comision_rrpp_porcentaje,
        metodo_pago,
        monto_efectivo,
        monto_transferencia,
        qr_code
    ) VALUES (
        v_mesa.id,
        v_mesa.uuid_evento,
        v_mesa.uuid_club,
        v_user_id,
        encrypt_dni(p_cliente_dni),
        p_cliente_nombre,
        p_cliente_email,
        v_precio_final,
        v_mesa.comision_tipo,
        v_mesa.comision_rrpp_monto,
        v_mesa.comision_rrpp_porcentaje,
        v_metodo_pago_enum,
        p_monto_efectivo,
        p_monto_transferencia,
        v_qr_code
    )
    RETURNING id INTO v_venta_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Mesa vendida exitosamente',
        'venta_id', v_venta_id,
        'mesa_id', v_mesa.id,
        'mesa_nombre', v_mesa.nombre,
        'qr_code', v_qr_code,
        'precio', v_precio_final,
        'metodo_pago', p_metodo_pago
    );
END;
$$;

-- Update function grant
GRANT EXECUTE ON FUNCTION public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL) TO authenticated;

COMMENT ON FUNCTION public.vender_mesa IS 'RRPP vende una mesa con metodo de pago (efectivo/transferencia/mixto). Crea venta con QR, cambia estado a vendido.';

-- ============================================
-- SECTION 6: Update ventas_mesas_decrypted View
-- ============================================

-- Recreate view to include new payment columns
CREATE OR REPLACE VIEW public.ventas_mesas_decrypted AS
SELECT
    id,
    uuid_mesa,
    uuid_evento,
    uuid_club,
    id_rrpp,
    decrypt_dni(cliente_dni) AS cliente_dni,  -- Decrypted DNI
    cliente_nombre,
    cliente_email,
    precio_venta,
    comision_tipo,
    comision_rrpp_monto,
    comision_rrpp_porcentaje,
    comision_calculada,
    metodo_pago,
    monto_efectivo,
    monto_transferencia,
    qr_code,
    created_at,
    updated_at
FROM public.ventas_mesas;

COMMENT ON VIEW public.ventas_mesas_decrypted IS 'View with decrypted cliente_dni and payment method details. Inherits RLS from ventas_mesas table.';

-- ============================================
-- SECTION 7: Create Index for metodo_pago
-- ============================================

-- Index for filtering by payment method (for analytics)
CREATE INDEX IF NOT EXISTS idx_ventas_mesas_metodo_pago ON public.ventas_mesas(metodo_pago);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_column_count INTEGER;
    v_index_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check columns exist
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 'ventas_mesas'
    AND column_name IN ('metodo_pago', 'monto_efectivo', 'monto_transferencia');

    IF v_column_count = 3 THEN
        RAISE NOTICE '✅ Payment columns added to ventas_mesas';
    ELSE
        RAISE WARNING '⚠️ Only % of 3 payment columns found', v_column_count;
    END IF;

    -- Check index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'ventas_mesas'
        AND indexname = 'idx_ventas_mesas_metodo_pago'
    ) INTO v_index_exists;

    IF v_index_exists THEN
        RAISE NOTICE '✅ Index idx_ventas_mesas_metodo_pago created';
    END IF;

    -- Check function updated
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'vender_mesa'
        AND routine_type = 'FUNCTION'
    ) INTO v_function_exists;

    IF v_function_exists THEN
        RAISE NOTICE '✅ Function vender_mesa updated';
    END IF;

    -- Check view updated
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ventas_mesas_decrypted'
        AND column_name = 'metodo_pago'
    ) THEN
        RAISE NOTICE '✅ View ventas_mesas_decrypted updated with payment fields';
    END IF;

    RAISE NOTICE '✅ Migration 073 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Remove columns
ALTER TABLE public.ventas_mesas DROP COLUMN IF EXISTS metodo_pago;
ALTER TABLE public.ventas_mesas DROP COLUMN IF EXISTS monto_efectivo;
ALTER TABLE public.ventas_mesas DROP COLUMN IF EXISTS monto_transferencia;

-- Drop index
DROP INDEX IF EXISTS public.idx_ventas_mesas_metodo_pago;

-- Restore original vender_mesa function (without payment params)
CREATE OR REPLACE FUNCTION public.vender_mesa(
    p_uuid_mesa UUID,
    p_cliente_dni TEXT,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_cliente_email TEXT DEFAULT NULL,
    p_precio_venta DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- ... original function body from 066_create_mesas_functions.sql ...
$$;

-- Restore original view
CREATE OR REPLACE VIEW public.ventas_mesas_decrypted AS
SELECT
    id,
    uuid_mesa,
    uuid_evento,
    uuid_club,
    id_rrpp,
    decrypt_dni(cliente_dni) AS cliente_dni,
    cliente_nombre,
    cliente_email,
    precio_venta,
    comision_tipo,
    comision_rrpp_monto,
    comision_rrpp_porcentaje,
    comision_calculada,
    qr_code,
    created_at,
    updated_at
FROM public.ventas_mesas;

-- Restore original validate_venta_mesa function (without payment validation)
-- ... function body from 064_create_mesas_ventas.sql ...
*/
