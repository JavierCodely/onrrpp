-- Migration: 066 - Create Mesas RPC Functions
-- Description: Business logic functions for scanning, reserving, and selling mesas
-- Dependencies: 065_create_mesas_triggers.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Function - Escanear Mesa Seguridad
-- ============================================

-- Seguridad scans QR to validate and register entry
CREATE OR REPLACE FUNCTION public.escanear_mesa_seguridad(
    p_qr_code TEXT,
    p_solo_verificar BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_user_nombre TEXT;
    v_user_apellido TEXT;
    v_venta_mesa RECORD;
    v_mesa RECORD;
    v_sector RECORD;
    v_is_assigned BOOLEAN;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club, nombre, apellido
    INTO v_user_role, v_user_club, v_user_nombre, v_user_apellido
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'seguridad' THEN
        RETURN json_build_object('success', false, 'error', 'Solo seguridad puede escanear mesas');
    END IF;

    -- Find venta by QR code
    SELECT * INTO v_venta_mesa
    FROM public.ventas_mesas
    WHERE qr_code = p_qr_code;

    IF v_venta_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'QR code invalido o venta no encontrada');
    END IF;

    -- Check club match
    IF v_venta_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Get mesa data
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = v_venta_mesa.uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check if mesa is sold
    IF v_mesa.estado != 'vendido' THEN
        RETURN json_build_object('success', false, 'error', 'Esta mesa no esta vendida');
    END IF;

    -- Check if limit reached
    IF v_mesa.escaneos_seguridad_count >= v_mesa.max_personas THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mesa completa: limite de personas alcanzado',
            'max_personas', v_mesa.max_personas,
            'escaneos_actuales', v_mesa.escaneos_seguridad_count
        );
    END IF;

    -- Get sector data
    SELECT * INTO v_sector
    FROM public.sectores
    WHERE id = v_mesa.uuid_sector;

    -- Check sector assignment (similar to lotes_seguridad)
    -- If sectores_seguridad table exists, validate assignment
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores_seguridad') THEN
        -- Check if any security is assigned to this sector
        IF EXISTS (SELECT 1 FROM public.sectores_seguridad WHERE uuid_sector = v_mesa.uuid_sector) THEN
            -- Check if current user is assigned
            SELECT EXISTS (
                SELECT 1 FROM public.sectores_seguridad
                WHERE uuid_sector = v_mesa.uuid_sector
                AND id_seguridad = v_user_id
            ) INTO v_is_assigned;

            IF NOT v_is_assigned THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Esta mesa pertenece al sector: ' || v_sector.nombre,
                    'sector_nombre', v_sector.nombre
                );
            END IF;
        END IF;
    END IF;

    -- If only verification, return success without creating escaneo
    IF p_solo_verificar THEN
        RETURN json_build_object(
            'success', true,
            'verificacion', true,
            'mesa_nombre', v_mesa.nombre,
            'sector_nombre', v_sector.nombre,
            'sector_imagen_url', v_sector.imagen_url,
            'coordenada_x', v_mesa.coordenada_x,
            'coordenada_y', v_mesa.coordenada_y,
            'max_personas', v_mesa.max_personas,
            'escaneos_actuales', v_mesa.escaneos_seguridad_count,
            'cliente_dni', v_venta_mesa.cliente_dni,
            'cliente_nombre', v_venta_mesa.cliente_nombre
        );
    END IF;

    -- Create escaneo record (trigger will increment counter)
    INSERT INTO public.escaneos_mesas (
        uuid_mesa,
        uuid_venta_mesa,
        tipo_escaneo,
        id_personal,
        nombre_personal,
        rol_personal,
        qr_code_escaneado
    ) VALUES (
        v_mesa.id,
        v_venta_mesa.id,
        'seguridad',
        v_user_id,
        v_user_nombre || ' ' || v_user_apellido,
        'seguridad',
        p_qr_code
    );

    -- Return success with mesa location info
    RETURN json_build_object(
        'success', true,
        'message', 'Ingreso registrado exitosamente',
        'mesa_nombre', v_mesa.nombre,
        'sector_nombre', v_sector.nombre,
        'sector_imagen_url', v_sector.imagen_url,
        'coordenada_x', v_mesa.coordenada_x,
        'coordenada_y', v_mesa.coordenada_y,
        'max_personas', v_mesa.max_personas,
        'escaneos_actuales', v_mesa.escaneos_seguridad_count + 1,
        'cliente_dni', v_venta_mesa.cliente_dni,
        'cliente_nombre', v_venta_mesa.cliente_nombre
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.escanear_mesa_seguridad(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.escanear_mesa_seguridad IS 'Seguridad escanea QR de mesa vendida para registrar ingreso. Valida limite de personas y muestra ubicacion.';

-- ============================================
-- SECTION 2: Function - Escanear Mesa Bartender
-- ============================================

-- Bartender scans QR to deliver consumicion
CREATE OR REPLACE FUNCTION public.escanear_mesa_bartender(
    p_qr_code TEXT,
    p_marcar_entregado BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_user_nombre TEXT;
    v_user_apellido TEXT;
    v_venta_mesa RECORD;
    v_mesa RECORD;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club, nombre, apellido
    INTO v_user_role, v_user_club, v_user_nombre, v_user_apellido
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'bartender' THEN
        RETURN json_build_object('success', false, 'error', 'Solo bartenders pueden escanear consumiciones');
    END IF;

    -- Find venta by QR code
    SELECT * INTO v_venta_mesa
    FROM public.ventas_mesas
    WHERE qr_code = p_qr_code;

    IF v_venta_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'QR code invalido o venta no encontrada');
    END IF;

    -- Check club match
    IF v_venta_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Get mesa data
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = v_venta_mesa.uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check if mesa has consumicion
    IF NOT v_mesa.tiene_consumicion THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Esta mesa no incluye consumicion'
        );
    END IF;

    -- Check if already delivered
    IF v_mesa.consumicion_entregada THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La consumicion ya fue entregada',
            'fecha_entrega', v_mesa.fecha_entrega_consumicion,
            'bartender_nombre', (
                SELECT nombre || ' ' || apellido
                FROM public.personal
                WHERE id = v_mesa.id_bartender_entrega
            )
        );
    END IF;

    -- If not marking as delivered, just return info
    IF NOT p_marcar_entregado THEN
        RETURN json_build_object(
            'success', true,
            'mostrar_confirmacion', true,
            'mesa_nombre', v_mesa.nombre,
            'detalle_consumicion', v_mesa.detalle_consumicion,
            'monto_consumicion', v_mesa.monto_consumicion,
            'cliente_dni', v_venta_mesa.cliente_dni,
            'cliente_nombre', v_venta_mesa.cliente_nombre
        );
    END IF;

    -- Mark as delivered (trigger will validate no duplicate scans)
    INSERT INTO public.escaneos_mesas (
        uuid_mesa,
        uuid_venta_mesa,
        tipo_escaneo,
        id_personal,
        nombre_personal,
        rol_personal,
        qr_code_escaneado
    ) VALUES (
        v_mesa.id,
        v_venta_mesa.id,
        'bartender',
        v_user_id,
        v_user_nombre || ' ' || v_user_apellido,
        'bartender',
        p_qr_code
    );

    -- Update mesa consumicion status
    UPDATE public.mesas
    SET
        consumicion_entregada = true,
        id_bartender_entrega = v_user_id,
        fecha_entrega_consumicion = NOW(),
        updated_at = NOW()
    WHERE id = v_mesa.id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Consumicion marcada como entregada',
        'mesa_nombre', v_mesa.nombre,
        'detalle_consumicion', v_mesa.detalle_consumicion,
        'fecha_entrega', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.escanear_mesa_bartender(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.escanear_mesa_bartender IS 'Bartender escanea QR de mesa para entregar consumicion. Solo permite 1 escaneo por mesa.';

-- ============================================
-- SECTION 3: Function - Reservar Mesa
-- ============================================

-- RRPP reserves a mesa (no sale, just blocks it)
CREATE OR REPLACE FUNCTION public.reservar_mesa(
    p_uuid_mesa UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_mesa RECORD;
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
        RETURN json_build_object('success', false, 'error', 'Solo RRPP puede reservar mesas');
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

    -- Check if mesa is libre
    IF v_mesa.estado != 'libre' THEN
        RETURN json_build_object('success', false, 'error', 'La mesa no esta disponible');
    END IF;

    -- Reserve mesa
    UPDATE public.mesas
    SET
        estado = 'reservado',
        id_rrpp = v_user_id,
        updated_at = NOW()
    WHERE id = p_uuid_mesa;

    RETURN json_build_object(
        'success', true,
        'message', 'Mesa reservada exitosamente',
        'mesa_id', v_mesa.id,
        'mesa_nombre', v_mesa.nombre
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reservar_mesa(UUID) TO authenticated;

COMMENT ON FUNCTION public.reservar_mesa IS 'RRPP reserva una mesa (sin venta, solo bloqueo temporal)';

-- ============================================
-- SECTION 4: Function - Liberar Reserva Mesa
-- ============================================

-- RRPP releases a reserved mesa back to libre
CREATE OR REPLACE FUNCTION public.liberar_reserva_mesa(
    p_uuid_mesa UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_mesa RECORD;
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

    IF v_user_role != 'rrpp' AND v_user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'error', 'Solo RRPP o Admin puede liberar reservas');
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

    -- Check if mesa is reservado
    IF v_mesa.estado != 'reservado' THEN
        RETURN json_build_object('success', false, 'error', 'La mesa no esta reservada');
    END IF;

    -- RRPP can only release their own reservations, admin can release any
    IF v_user_role = 'rrpp' AND v_mesa.id_rrpp != v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Solo puedes liberar tus propias reservas');
    END IF;

    -- Release mesa
    UPDATE public.mesas
    SET
        estado = 'libre',
        id_rrpp = NULL,
        updated_at = NOW()
    WHERE id = p_uuid_mesa;

    RETURN json_build_object(
        'success', true,
        'message', 'Reserva liberada exitosamente',
        'mesa_id', v_mesa.id,
        'mesa_nombre', v_mesa.nombre
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.liberar_reserva_mesa(UUID) TO authenticated;

COMMENT ON FUNCTION public.liberar_reserva_mesa IS 'RRPP libera una mesa reservada (vuelve a libre)';

-- ============================================
-- SECTION 5: Function - Vender Mesa
-- ============================================

-- RRPP sells a mesa (creates venta_mesa with QR)
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
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_mesa RECORD;
    v_qr_code TEXT;
    v_venta_id UUID;
    v_precio_final DECIMAL;
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

    -- Generate QR code (format: MESA-{uuid_mesa}-{timestamp})
    v_qr_code := 'MESA-' || p_uuid_mesa::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;

    -- Create venta (trigger will update mesa estado to vendido)
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
        qr_code
    ) VALUES (
        v_mesa.id,
        v_mesa.uuid_evento,
        v_mesa.uuid_club,
        v_user_id,
        p_cliente_dni,
        p_cliente_nombre,
        p_cliente_email,
        v_precio_final,
        v_mesa.comision_tipo,
        v_mesa.comision_rrpp_monto,
        v_mesa.comision_rrpp_porcentaje,
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
        'precio', v_precio_final
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL) TO authenticated;

COMMENT ON FUNCTION public.vender_mesa IS 'RRPP vende una mesa (crea venta con QR, cambia estado a vendido)';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check functions exist
    IF (SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN (
            'escanear_mesa_seguridad',
            'escanear_mesa_bartender',
            'reservar_mesa',
            'liberar_reserva_mesa',
            'vender_mesa'
        )
    ) = 5 THEN
        RAISE NOTICE '✅ All RPC functions created successfully';
    END IF;

    RAISE NOTICE '✅ Migration 066 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop functions
DROP FUNCTION IF EXISTS public.escanear_mesa_seguridad(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.escanear_mesa_bartender(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.reservar_mesa(UUID);
DROP FUNCTION IF EXISTS public.liberar_reserva_mesa(UUID);
DROP FUNCTION IF EXISTS public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL);
*/
