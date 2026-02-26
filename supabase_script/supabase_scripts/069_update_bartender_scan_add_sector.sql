-- Migration: 069 - Update escanear_mesa_bartender with sector_nombre
-- Description: Add sector_nombre to the verify response (p_marcar_entregado = false) in escanear_mesa_bartender function
-- Dependencies: 066_create_mesas_functions.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-31

-- ============================================
-- SECTION 1: Update Function - Escanear Mesa Bartender
-- ============================================

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
    v_sector RECORD;
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

    -- Get sector data
    SELECT * INTO v_sector
    FROM public.sectores
    WHERE id = v_mesa.uuid_sector;

    -- If not marking as delivered, just return info (with sector_nombre added)
    IF NOT p_marcar_entregado THEN
        RETURN json_build_object(
            'success', true,
            'mostrar_confirmacion', true,
            'mesa_nombre', v_mesa.nombre,
            'sector_nombre', v_sector.nombre,
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

COMMENT ON FUNCTION public.escanear_mesa_bartender IS 'Bartender escanea QR de mesa para entregar consumicion. Retorna sector_nombre en verificacion. Solo permite 1 escaneo por mesa.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 069 completed successfully - escanear_mesa_bartender updated with sector_nombre';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- To rollback, execute migration 066 to restore original function
*/
