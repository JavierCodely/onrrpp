-- Migration: 059 - Update marcar_ingreso to Allow Resolving Rejected Invitados
-- Description: Modifies marcar_ingreso to allow security to resolve rejections and permit entry.
--              When a rejected invitado is scanned, security can choose to clear the rejection and allow entry.
--              Added p_solo_verificar parameter to check permissions without marking entry.
-- Dependencies: 058_integrate_lotes_seguridad_with_scan_functions.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-27

-- ============================================
-- SECTION 0: Drop existing function to avoid conflicts
-- ============================================

-- Drop the old function signature from 058 before creating the new one
DROP FUNCTION IF EXISTS public.marcar_ingreso(TEXT);
DROP FUNCTION IF EXISTS public.marcar_ingreso(TEXT, BOOLEAN);

-- ============================================
-- SECTION 1: Update marcar_ingreso Function
-- ============================================

-- Enhanced version that allows:
-- 1. Just verification (p_solo_verificar = true): returns status without modifying
-- 2. Resolving rejections (p_resolver_rechazo = true): clears rejection and marks entry
-- 3. Normal entry (both false): marks entry if all validations pass
CREATE OR REPLACE FUNCTION public.marcar_ingreso(
    p_qr_code TEXT,
    p_resolver_rechazo BOOLEAN DEFAULT FALSE,
    p_solo_verificar BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitado_id UUID;
    v_invitado_lote UUID;
    v_lote_nombre TEXT;
    v_lote_activo BOOLEAN;
    v_user_id UUID;
    v_user_role user_role;
    v_invitado_club UUID;
    v_user_club UUID;
    v_is_assigned BOOLEAN;
    v_has_any_assignment BOOLEAN;
    v_already_ingresado BOOLEAN;
    v_is_rechazado BOOLEAN;
    v_razon_rechazo razon_rechazo_type;
    v_razon_rechazo_detalle TEXT;
    v_fecha_rechazo TIMESTAMPTZ;
    v_es_vip BOOLEAN;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user role and club
    SELECT rol, uuid_club INTO v_user_role, v_user_club
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'seguridad' THEN
        RETURN json_build_object('success', false, 'error', 'Solo seguridad puede marcar ingresos');
    END IF;

    -- Find invitado by QR code with rejection details
    SELECT
        i.id,
        i.uuid_lote,
        e.uuid_club,
        i.ingresado,
        i.rechazado,
        i.razon_rechazo,
        i.razon_rechazo_detalle,
        i.fecha_rechazo
    INTO
        v_invitado_id,
        v_invitado_lote,
        v_invitado_club,
        v_already_ingresado,
        v_is_rechazado,
        v_razon_rechazo,
        v_razon_rechazo_detalle,
        v_fecha_rechazo
    FROM public.invitados i
    JOIN public.eventos e ON i.uuid_evento = e.id
    WHERE i.qr_code = p_qr_code;

    IF v_invitado_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invitado no encontrado');
    END IF;

    -- Check club match
    IF v_invitado_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este invitado');
    END IF;

    -- Check lote info (active, VIP, name)
    IF v_invitado_lote IS NOT NULL THEN
        SELECT l.nombre, l.activo, l.es_vip
        INTO v_lote_nombre, v_lote_activo, v_es_vip
        FROM public.lotes l
        WHERE l.id = v_invitado_lote;

        -- Check if lote is active
        IF NOT v_lote_activo THEN
            RETURN json_build_object(
                'success', false,
                'error', 'El lote "' || v_lote_nombre || '" está desactivado',
                'lote_desactivado', true,
                'lote_nombre', v_lote_nombre
            );
        END IF;

        -- Check if there are ANY assignments for this lote
        SELECT EXISTS (
            SELECT 1 FROM public.lotes_seguridad ls
            WHERE ls.uuid_lote = v_invitado_lote
        ) INTO v_has_any_assignment;

        -- Only check assignment if lote has security assignments
        IF v_has_any_assignment THEN
            -- Check if the security person is assigned to this lote
            SELECT EXISTS (
                SELECT 1
                FROM public.lotes_seguridad ls
                WHERE ls.uuid_lote = v_invitado_lote
                AND ls.id_seguridad = v_user_id
            ) INTO v_is_assigned;

            IF NOT v_is_assigned THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Este cliente pertenece al ' || v_lote_nombre,
                    'lote_nombre', v_lote_nombre,
                    'lote_no_asignado', true
                );
            END IF;
        END IF;
    END IF;

    -- Check if already checked in (for non-VIP)
    IF v_already_ingresado AND NOT COALESCE(v_es_vip, false) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Este invitado ya ha ingresado',
            'already_ingresado', true
        );
    END IF;

    -- Handle rejected invitado
    IF v_is_rechazado THEN
        -- If not requesting to resolve, return rejection info
        IF NOT p_resolver_rechazo THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Este invitado fue rechazado',
                'rechazado', true,
                'razon_rechazo', v_razon_rechazo,
                'razon_rechazo_detalle', v_razon_rechazo_detalle,
                'fecha_rechazo', v_fecha_rechazo,
                'puede_resolver', true
            );
        END IF;

        -- If only verifying, don't modify anything
        IF p_solo_verificar THEN
            RETURN json_build_object(
                'success', true,
                'invitado_id', v_invitado_id,
                'lote_nombre', v_lote_nombre,
                'verificacion', true,
                'message', 'Verificacion exitosa - puede resolver rechazo e ingresar'
            );
        END IF;

        -- Resolve rejection: clear rejection fields and mark as ingresado
        UPDATE public.invitados
        SET
            rechazado = false,
            razon_rechazo = NULL,
            razon_rechazo_detalle = NULL,
            fecha_rechazo = NULL,
            id_seguridad_rechazo = NULL,
            ingresado = true,
            fecha_ingreso = NOW(),
            updated_at = NOW()
        WHERE id = v_invitado_id;

        RETURN json_build_object(
            'success', true,
            'invitado_id', v_invitado_id,
            'lote_nombre', v_lote_nombre,
            'rechazo_resuelto', true,
            'message', 'Rechazo resuelto e ingreso registrado exitosamente'
        );
    END IF;

    -- If only verifying (no rejection case), return success without modifying
    IF p_solo_verificar THEN
        RETURN json_build_object(
            'success', true,
            'invitado_id', v_invitado_id,
            'lote_nombre', v_lote_nombre,
            'es_vip', COALESCE(v_es_vip, false),
            'verificacion', true,
            'message', 'Verificacion exitosa - puede ingresar'
        );
    END IF;

    -- Normal ingreso (not rejected, not just verification)
    UPDATE public.invitados
    SET
        ingresado = true,
        fecha_ingreso = NOW(),
        updated_at = NOW()
    WHERE id = v_invitado_id;

    RETURN json_build_object(
        'success', true,
        'invitado_id', v_invitado_id,
        'lote_nombre', v_lote_nombre,
        'message', 'Ingreso registrado exitosamente'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.marcar_ingreso(TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.marcar_ingreso IS 'Marca un invitado como ingresado. Valida asignacion de lote. p_solo_verificar=true solo verifica sin marcar. p_resolver_rechazo=true resuelve rechazos previos.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

/*
-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'marcar_ingreso'
ORDER BY routine_name;

-- Test verification only (should NOT mark entry)
-- SELECT public.marcar_ingreso('test-qr-code', false, true);

-- Test actual entry (should mark entry)
-- SELECT public.marcar_ingreso('test-qr-code', false, false);

-- Test resolve rejection and enter
-- SELECT public.marcar_ingreso('test-qr-code', true, false);
*/
