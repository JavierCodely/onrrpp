-- Migration: 064 - Create Ventas Mesas and Escaneos Mesas Tables
-- Description: Sales tracking for tables and scan history for seguridad/bartender
-- Dependencies: 063_create_mesas_table.sql, 042_create_clientes_table.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Table ventas_mesas (Sales)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ventas_mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_mesa UUID NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    id_rrpp UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,

    -- Cliente info
    cliente_dni TEXT NOT NULL,
    cliente_nombre TEXT,
    cliente_email TEXT,

    -- Pricing
    precio_venta DECIMAL(10, 2) NOT NULL,
    comision_tipo comision_tipo NOT NULL,
    comision_rrpp_monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    comision_rrpp_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 0,
    comision_calculada DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- QR Code único por venta
    qr_code TEXT NOT NULL UNIQUE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT precio_venta_valido CHECK (precio_venta >= 0),
    CONSTRAINT comision_monto_valido CHECK (comision_rrpp_monto >= 0),
    CONSTRAINT comision_porcentaje_valido CHECK (comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100),
    CONSTRAINT comision_calculada_valida CHECK (comision_calculada >= 0),
    CONSTRAINT cliente_dni_no_vacio CHECK (LENGTH(TRIM(cliente_dni)) > 0),
    CONSTRAINT qr_code_no_vacio CHECK (LENGTH(TRIM(qr_code)) > 0),
    CONSTRAINT una_venta_por_mesa UNIQUE(uuid_mesa)
);

-- Create indexes
CREATE INDEX idx_ventas_mesas_uuid_mesa ON public.ventas_mesas(uuid_mesa);
CREATE INDEX idx_ventas_mesas_uuid_evento ON public.ventas_mesas(uuid_evento);
CREATE INDEX idx_ventas_mesas_uuid_club ON public.ventas_mesas(uuid_club);
CREATE INDEX idx_ventas_mesas_id_rrpp ON public.ventas_mesas(id_rrpp);
CREATE INDEX idx_ventas_mesas_cliente_dni ON public.ventas_mesas(cliente_dni);
CREATE INDEX idx_ventas_mesas_qr_code ON public.ventas_mesas(qr_code);
CREATE INDEX idx_ventas_mesas_created_at ON public.ventas_mesas(created_at);

-- Add comments
COMMENT ON TABLE public.ventas_mesas IS 'Registro de ventas de mesas con tracking de comisiones y QR code';
COMMENT ON COLUMN public.ventas_mesas.uuid_mesa IS 'Mesa vendida (relacion 1:1)';
COMMENT ON COLUMN public.ventas_mesas.id_rrpp IS 'RRPP que realizo la venta';
COMMENT ON COLUMN public.ventas_mesas.cliente_dni IS 'DNI del cliente comprador';
COMMENT ON COLUMN public.ventas_mesas.cliente_nombre IS 'Nombre del cliente (opcional)';
COMMENT ON COLUMN public.ventas_mesas.cliente_email IS 'Email del cliente (opcional)';
COMMENT ON COLUMN public.ventas_mesas.precio_venta IS 'Precio al que se vendio la mesa';
COMMENT ON COLUMN public.ventas_mesas.comision_calculada IS 'Comision calculada final para el RRPP';
COMMENT ON COLUMN public.ventas_mesas.qr_code IS 'QR code unico generado para esta venta de mesa';

-- ============================================
-- SECTION 2: Table escaneos_mesas (Scan History)
-- ============================================

-- Enum para tipo de escaneo
CREATE TYPE tipo_escaneo_mesa AS ENUM ('seguridad', 'bartender');

COMMENT ON TYPE tipo_escaneo_mesa IS 'Tipo de escaneo: seguridad (entrada) o bartender (entrega consumicion)';

CREATE TABLE IF NOT EXISTS public.escaneos_mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_mesa UUID NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
    uuid_venta_mesa UUID NOT NULL REFERENCES public.ventas_mesas(id) ON DELETE CASCADE,
    tipo_escaneo tipo_escaneo_mesa NOT NULL,

    -- Personal que escaneó
    id_personal UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    nombre_personal TEXT NOT NULL,
    rol_personal user_role NOT NULL,

    -- Metadata del escaneo
    qr_code_escaneado TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT qr_no_vacio CHECK (LENGTH(TRIM(qr_code_escaneado)) > 0),
    CONSTRAINT nombre_personal_no_vacio CHECK (LENGTH(TRIM(nombre_personal)) > 0)
);

-- Create indexes
CREATE INDEX idx_escaneos_mesas_uuid_mesa ON public.escaneos_mesas(uuid_mesa);
CREATE INDEX idx_escaneos_mesas_uuid_venta_mesa ON public.escaneos_mesas(uuid_venta_mesa);
CREATE INDEX idx_escaneos_mesas_tipo_escaneo ON public.escaneos_mesas(tipo_escaneo);
CREATE INDEX idx_escaneos_mesas_id_personal ON public.escaneos_mesas(id_personal);
CREATE INDEX idx_escaneos_mesas_created_at ON public.escaneos_mesas(created_at);

-- Add comments
COMMENT ON TABLE public.escaneos_mesas IS 'Historial de escaneos de mesas (seguridad y bartender)';
COMMENT ON COLUMN public.escaneos_mesas.tipo_escaneo IS 'Tipo: seguridad (entrada) o bartender (entrega consumicion)';
COMMENT ON COLUMN public.escaneos_mesas.id_personal IS 'Personal que realizo el escaneo (seguridad o bartender)';
COMMENT ON COLUMN public.escaneos_mesas.nombre_personal IS 'Nombre completo del personal (para auditoria)';
COMMENT ON COLUMN public.escaneos_mesas.rol_personal IS 'Rol del personal (seguridad o bartender)';
COMMENT ON COLUMN public.escaneos_mesas.qr_code_escaneado IS 'QR code que fue escaneado';

-- ============================================
-- SECTION 3: Triggers for updated_at
-- ============================================

CREATE TRIGGER trigger_ventas_mesas_updated_at
    BEFORE UPDATE ON public.ventas_mesas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SECTION 4: Validation Trigger for ventas_mesas
-- ============================================

-- Calculate comision and validate
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

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_venta_mesa
    BEFORE INSERT OR UPDATE ON public.ventas_mesas
    FOR EACH ROW
    EXECUTE FUNCTION validate_venta_mesa();

COMMENT ON FUNCTION validate_venta_mesa IS 'Calcula la comision y valida relaciones de club para ventas de mesas';

-- ============================================
-- SECTION 5: Validation Trigger for escaneos_mesas
-- ============================================

-- Validate escaneo type matches personal role
CREATE OR REPLACE FUNCTION validate_escaneo_mesa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_personal_rol user_role;
    v_personal_nombre TEXT;
    v_personal_apellido TEXT;
BEGIN
    -- Get personal info
    SELECT rol, nombre, apellido INTO v_personal_rol, v_personal_nombre, v_personal_apellido
    FROM public.personal
    WHERE id = NEW.id_personal
    AND activo = true;

    IF v_personal_rol IS NULL THEN
        RAISE EXCEPTION 'El personal especificado no existe o esta inactivo';
    END IF;

    -- Validate tipo_escaneo matches rol
    IF NEW.tipo_escaneo = 'seguridad' AND v_personal_rol != 'seguridad' THEN
        RAISE EXCEPTION 'Solo personal con rol seguridad puede realizar escaneos de tipo seguridad';
    END IF;

    IF NEW.tipo_escaneo = 'bartender' AND v_personal_rol != 'bartender' THEN
        RAISE EXCEPTION 'Solo personal con rol bartender puede realizar escaneos de tipo bartender';
    END IF;

    -- Auto-fill nombre_personal and rol_personal
    NEW.nombre_personal := v_personal_nombre || ' ' || v_personal_apellido;
    NEW.rol_personal := v_personal_rol;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_escaneo_mesa
    BEFORE INSERT ON public.escaneos_mesas
    FOR EACH ROW
    EXECUTE FUNCTION validate_escaneo_mesa();

COMMENT ON FUNCTION validate_escaneo_mesa IS 'Valida que el tipo de escaneo coincida con el rol del personal';

-- ============================================
-- SECTION 6: RLS Policies - ventas_mesas
-- ============================================

ALTER TABLE public.ventas_mesas ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view ventas from their club
CREATE POLICY "Users can view ventas_mesas from their club"
ON public.ventas_mesas
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- INSERT: Only RRPP and admins can create ventas
CREATE POLICY "RRPP can create their own ventas_mesas"
ON public.ventas_mesas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_club = public.get_current_user_club()
);

CREATE POLICY "Admins can create ventas_mesas"
ON public.ventas_mesas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- UPDATE: Only admins can update ventas
CREATE POLICY "Admins can update ventas_mesas"
ON public.ventas_mesas
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- DELETE: Only admins can delete ventas
CREATE POLICY "Admins can delete ventas_mesas"
ON public.ventas_mesas
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- ============================================
-- SECTION 7: RLS Policies - escaneos_mesas
-- ============================================

ALTER TABLE public.escaneos_mesas ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view escaneos from their club
CREATE POLICY "Users can view escaneos_mesas from their club"
ON public.escaneos_mesas
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ventas_mesas vm
        WHERE vm.id = escaneos_mesas.uuid_venta_mesa
        AND vm.uuid_club = public.get_current_user_club()
    )
);

-- INSERT: Seguridad and bartender can create escaneos
CREATE POLICY "Seguridad can create escaneos_mesas"
ON public.escaneos_mesas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('seguridad'::user_role)
    AND tipo_escaneo = 'seguridad'
    AND id_personal = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.ventas_mesas vm
        WHERE vm.id = uuid_venta_mesa
        AND vm.uuid_club = public.get_current_user_club()
    )
);

CREATE POLICY "Bartender can create escaneos_mesas"
ON public.escaneos_mesas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('bartender'::user_role)
    AND tipo_escaneo = 'bartender'
    AND id_personal = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.ventas_mesas vm
        WHERE vm.id = uuid_venta_mesa
        AND vm.uuid_club = public.get_current_user_club()
    )
);

-- No UPDATE or DELETE policies (escaneos are immutable audit log)

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_mesas') THEN
        RAISE NOTICE '✅ Table ventas_mesas created successfully';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escaneos_mesas') THEN
        RAISE NOTICE '✅ Table escaneos_mesas created successfully';
    END IF;

    -- Check enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_escaneo_mesa') THEN
        RAISE NOTICE '✅ Enum tipo_escaneo_mesa created';
    END IF;

    -- Check RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ventas_mesas' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS enabled on ventas_mesas';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'escaneos_mesas' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS enabled on escaneos_mesas';
    END IF;

    -- Check policies exist
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ventas_mesas') >= 5 THEN
        RAISE NOTICE '✅ RLS policies created for ventas_mesas';
    END IF;

    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'escaneos_mesas') >= 3 THEN
        RAISE NOTICE '✅ RLS policies created for escaneos_mesas';
    END IF;

    RAISE NOTICE '✅ Migration 064 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_validate_venta_mesa ON public.ventas_mesas;
DROP TRIGGER IF EXISTS trigger_validate_escaneo_mesa ON public.escaneos_mesas;
DROP TRIGGER IF EXISTS trigger_ventas_mesas_updated_at ON public.ventas_mesas;
DROP FUNCTION IF EXISTS validate_venta_mesa();
DROP FUNCTION IF EXISTS validate_escaneo_mesa();

-- Drop tables
DROP TABLE IF EXISTS public.escaneos_mesas CASCADE;
DROP TABLE IF EXISTS public.ventas_mesas CASCADE;

-- Drop enum
DROP TYPE IF EXISTS tipo_escaneo_mesa;
*/
