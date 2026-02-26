-- Migration: 058 - Integrate Lotes-Seguridad Assignment with Scan Functions
-- Description: Updates existing ingresado and rechazo functions to validate lote assignment
--              before allowing seguridad to perform actions
-- Dependencies: 057_create_lotes_seguridad_assignment.sql, 047_rechazo_invitados
-- Author: Claude Supabase Expert
-- Date: 2026-01-27

-- ============================================
-- SECTION 1: Update rechazar_invitado Function
-- ============================================

-- Enhanced version that checks lote assignment before allowing rejection
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
    v_user_id UUID;
    v_user_role user_role;
    v_invitado_club UUID;
    v_user_club UUID;
    v_is_assigned BOOLEAN;
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

    -- NEW: Check lote assignment if invitado has a lote
    IF v_invitado_lote IS NOT NULL THEN
        -- Get lote name
        SELECT l.nombre INTO v_lote_nombre
        FROM public.lotes l
        WHERE l.id = v_invitado_lote;

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
                'lote_nombre', v_lote_nombre
            );
        END IF;
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

COMMENT ON FUNCTION public.rechazar_invitado IS 'Marca un invitado como rechazado. Valida asignacion de lote antes de permitir rechazo.';

-- ============================================
-- SECTION 2: Create marcar_ingreso Function
-- ============================================

-- Function to mark invitado as ingresado (checked in)
-- This replaces direct UPDATE queries from frontend
CREATE OR REPLACE FUNCTION public.marcar_ingreso(
    p_qr_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitado_id UUID;
    v_invitado_lote UUID;
    v_lote_nombre TEXT;
    v_user_id UUID;
    v_user_role user_role;
    v_invitado_club UUID;
    v_user_club UUID;
    v_is_assigned BOOLEAN;
    v_already_ingresado BOOLEAN;
    v_is_rechazado BOOLEAN;
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

    -- Find invitado by QR code
    SELECT i.id, i.uuid_lote, e.uuid_club, i.ingresado, i.rechazado
    INTO v_invitado_id, v_invitado_lote, v_invitado_club, v_already_ingresado, v_is_rechazado
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

    -- Check if already rejected
    IF v_is_rechazado THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Este invitado fue rechazado y no puede ingresar'
        );
    END IF;

    -- Check if already checked in
    IF v_already_ingresado THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Este invitado ya ha ingresado',
            'already_ingresado', true
        );
    END IF;

    -- Check lote assignment if invitado has a lote
    IF v_invitado_lote IS NOT NULL THEN
        -- Get lote name
        SELECT l.nombre INTO v_lote_nombre
        FROM public.lotes l
        WHERE l.id = v_invitado_lote;

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
                'lote_nombre', v_lote_nombre
            );
        END IF;
    END IF;

    -- Mark as ingresado
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
GRANT EXECUTE ON FUNCTION public.marcar_ingreso(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.marcar_ingreso IS 'Marca un invitado como ingresado. Valida asignacion de lote y que no este rechazado antes de permitir ingreso.';

-- ============================================
-- SECTION 3: Create Helper View - Seguridad Assigned Lotes
-- ============================================

-- View to easily see which lotes are assigned to which seguridad
CREATE OR REPLACE VIEW public.seguridad_lotes_asignados AS
SELECT
    ls.id,
    ls.uuid_lote,
    ls.id_seguridad,
    p.nombre AS seguridad_nombre,
    p.apellido AS seguridad_apellido,
    l.nombre AS lote_nombre,
    l.es_vip AS lote_es_vip,
    e.id AS uuid_evento,
    e.nombre AS evento_nombre,
    e.uuid_club,
    ls.created_at,
    ls.updated_at
FROM public.lotes_seguridad ls
JOIN public.personal p ON ls.id_seguridad = p.id
JOIN public.lotes l ON ls.uuid_lote = l.id
JOIN public.eventos e ON l.uuid_evento = e.id
WHERE p.activo = true
ORDER BY e.nombre, l.nombre, p.apellido, p.nombre;

-- Enable RLS on the view
ALTER VIEW public.seguridad_lotes_asignados SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW public.seguridad_lotes_asignados IS 'Vista con informacion detallada de asignaciones seguridad-lotes';

-- Grant select permission
GRANT SELECT ON public.seguridad_lotes_asignados TO authenticated;

-- ============================================
-- SECTION 4: Create Helper Function - Get My Assigned Lotes
-- ============================================

-- Function for seguridad to see their assigned lotes
CREATE OR REPLACE FUNCTION public.get_my_assigned_lotes()
RETURNS TABLE (
    uuid_lote UUID,
    lote_nombre TEXT,
    lote_es_vip BOOLEAN,
    cantidad_actual INTEGER,
    cantidad_maxima INTEGER,
    uuid_evento UUID,
    evento_nombre TEXT,
    evento_fecha TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Get user role and club
    SELECT p.rol, p.uuid_club INTO v_user_role, v_user_club
    FROM public.personal p
    WHERE p.id = v_user_id AND p.activo = true;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado o inactivo';
    END IF;

    IF v_user_role != 'seguridad' THEN
        RAISE EXCEPTION 'Solo personal de seguridad puede ver lotes asignados';
    END IF;

    -- Return assigned lotes
    RETURN QUERY
    SELECT
        l.id AS uuid_lote,
        l.nombre AS lote_nombre,
        l.es_vip AS lote_es_vip,
        l.cantidad_actual,
        l.cantidad_maxima,
        e.id AS uuid_evento,
        e.nombre AS evento_nombre,
        e.fecha AS evento_fecha
    FROM public.lotes_seguridad ls
    JOIN public.lotes l ON ls.uuid_lote = l.id
    JOIN public.eventos e ON l.uuid_evento = e.id
    WHERE ls.id_seguridad = v_user_id
    AND e.uuid_club = v_user_club
    AND e.estado = true -- Only active events
    ORDER BY e.fecha DESC, l.nombre;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_assigned_lotes() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_my_assigned_lotes IS 'Retorna los lotes asignados al seguridad actual';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the migration worked:
/*

-- Check updated functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('rechazar_invitado', 'marcar_ingreso', 'check_seguridad_can_scan', 'get_my_assigned_lotes')
ORDER BY routine_name;

-- Check view exists
SELECT * FROM information_schema.views WHERE table_name = 'seguridad_lotes_asignados';

-- Test get_my_assigned_lotes as seguridad user
-- SELECT * FROM public.get_my_assigned_lotes();

-- Test check_seguridad_can_scan
-- SELECT public.check_seguridad_can_scan('test-qr-code');

-- Test marcar_ingreso
-- SELECT public.marcar_ingreso('test-qr-code');

-- View assignments
-- SELECT * FROM public.seguridad_lotes_asignados;

*/

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop new functions
DROP FUNCTION IF EXISTS public.marcar_ingreso(TEXT);
DROP FUNCTION IF EXISTS public.get_my_assigned_lotes();

-- Drop view
DROP VIEW IF EXISTS public.seguridad_lotes_asignados;

-- Restore original rechazar_invitado function (you'd need to paste the original version here)
-- DROP FUNCTION IF EXISTS public.rechazar_invitado(TEXT, razon_rechazo_type, TEXT);
*/
