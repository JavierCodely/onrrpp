-- Migration: 060 - Fix rechazar_invitado Lote Assignment Check
-- Description: Fixes the rechazar_invitado function to only check lote assignment
--              if there are ANY security personnel assigned to that lote.
--              If no one is assigned, any security can reject.
-- Dependencies: 058_integrate_lotes_seguridad_with_scan_functions.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-27

-- ============================================
-- SECTION 1: Fix rechazar_invitado Function
-- ============================================

CREATE OR REPLACE FUNCTION public.rechazar_invitado(
    p_qr_code TEXT,
    p_razon razon_rechazo_type,
    p_detalle TEXT DEFAULT NULL
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
        RETURN json_build_object('success', false, 'error', 'Solo seguridad puede rechazar invitados');
    END IF;

    -- Find invitado by QR code
    SELECT i.id, i.uuid_lote, e.uuid_club
    INTO v_invitado_id, v_invitado_lote, v_invitado_club
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

    -- Check lote assignment if invitado has a lote
    IF v_invitado_lote IS NOT NULL THEN
        -- Get lote info
        SELECT l.nombre, l.activo INTO v_lote_nombre, v_lote_activo
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

        -- FIXED: First check if there are ANY assignments for this lote
        SELECT EXISTS (
            SELECT 1 FROM public.lotes_seguridad ls
            WHERE ls.uuid_lote = v_invitado_lote
        ) INTO v_has_any_assignment;

        -- Only check specific assignment if lote has any security assigned
        IF v_has_any_assignment THEN
            -- Check if THIS security person is assigned to this lote
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
        -- If no assignments exist for this lote, any security can reject
    END IF;

    -- Update invitado as rejected
    UPDATE public.invitados
    SET
        rechazado = true,
        razon_rechazo = p_razon,
        razon_rechazo_detalle = CASE WHEN p_razon = 'otro' THEN p_detalle ELSE NULL END,
        fecha_rechazo = NOW(),
        id_seguridad_rechazo = v_user_id,
        updated_at = NOW()
    WHERE id = v_invitado_id;

    RETURN json_build_object(
        'success', true,
        'invitado_id', v_invitado_id,
        'message', 'Invitado rechazado exitosamente'
    );
END;
$$;

-- Grant execute permission (in case it wasn't granted before)
GRANT EXECUTE ON FUNCTION public.rechazar_invitado(TEXT, razon_rechazo_type, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.rechazar_invitado IS 'Marca un invitado como rechazado. Solo valida asignacion de lote si hay seguridad asignados a ese lote.';

-- ============================================
-- VERIFICATION
-- ============================================

/*
-- Test the fix:
-- 1. If lote has NO security assigned -> any security can reject
-- 2. If lote has security assigned -> only assigned security can reject

-- Check if function was updated
SELECT routine_name, last_altered
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'rechazar_invitado';
*/
