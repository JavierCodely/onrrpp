-- Migration: 057 - Create Lotes-Seguridad Assignment System
-- Description: Implements many-to-many relationship between lotes and security personnel.
--              Security can only scan QR codes from invitados in their assigned lotes.
-- Dependencies: 017_create_lotes.sql, 003_create_personal.sql, 047_rechazo_invitados
-- Author: Claude Supabase Expert
-- Date: 2026-01-27

-- ============================================
-- SECTION 1: Table Creation (Many-to-Many)
-- ============================================

-- Create the junction table for lotes-seguridad assignment
CREATE TABLE IF NOT EXISTS public.lotes_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_lote UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
    id_seguridad UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_lote_seguridad UNIQUE(uuid_lote, id_seguridad)
);

-- Create indexes for performance
CREATE INDEX idx_lotes_seguridad_uuid_lote ON public.lotes_seguridad(uuid_lote);
CREATE INDEX idx_lotes_seguridad_id_seguridad ON public.lotes_seguridad(id_seguridad);

-- Add comments
COMMENT ON TABLE public.lotes_seguridad IS 'Asignacion de personal de seguridad a lotes. Solo seguridad asignado puede escanear QR de ese lote.';
COMMENT ON COLUMN public.lotes_seguridad.uuid_lote IS 'Lote al que se asigna seguridad';
COMMENT ON COLUMN public.lotes_seguridad.id_seguridad IS 'Personal de seguridad asignado (debe tener rol = seguridad)';

-- ============================================
-- SECTION 2: Validation Trigger
-- ============================================

-- Function to validate that id_seguridad actually has 'seguridad' role
CREATE OR REPLACE FUNCTION validate_lotes_seguridad_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_personal_role user_role;
    v_personal_club UUID;
    v_lote_club UUID;
BEGIN
    -- Get the role and club of the person being assigned
    SELECT p.rol, p.uuid_club INTO v_personal_role, v_personal_club
    FROM public.personal p
    WHERE p.id = NEW.id_seguridad AND p.activo = true;

    IF v_personal_role IS NULL THEN
        RAISE EXCEPTION 'El personal especificado no existe o está inactivo';
    END IF;

    IF v_personal_role != 'seguridad' THEN
        RAISE EXCEPTION 'Solo personal con rol "seguridad" puede ser asignado a lotes';
    END IF;

    -- Get the club of the lote
    SELECT e.uuid_club INTO v_lote_club
    FROM public.lotes l
    JOIN public.eventos e ON l.uuid_evento = e.id
    WHERE l.id = NEW.uuid_lote;

    IF v_lote_club IS NULL THEN
        RAISE EXCEPTION 'El lote especificado no existe';
    END IF;

    -- Validate that seguridad and lote belong to the same club
    IF v_personal_club != v_lote_club THEN
        RAISE EXCEPTION 'El personal de seguridad y el lote deben pertenecer al mismo club';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_lotes_seguridad_role
    BEFORE INSERT OR UPDATE ON public.lotes_seguridad
    FOR EACH ROW
    EXECUTE FUNCTION validate_lotes_seguridad_role();

COMMENT ON FUNCTION validate_lotes_seguridad_role IS 'Valida que solo personal con rol seguridad sea asignado y que pertenezcan al mismo club';

-- ============================================
-- SECTION 3: RLS Policies
-- ============================================

ALTER TABLE public.lotes_seguridad ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see assignments from their club
CREATE POLICY "Users can view lotes_seguridad from their club"
ON public.lotes_seguridad
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.lotes l
        JOIN public.eventos e ON l.uuid_evento = e.id
        WHERE l.id = lotes_seguridad.uuid_lote
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- INSERT: Only admins can assign seguridad to lotes
CREATE POLICY "Admins can assign seguridad to lotes"
ON public.lotes_seguridad
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.lotes l
        JOIN public.eventos e ON l.uuid_evento = e.id
        WHERE l.id = uuid_lote
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- UPDATE: Only admins can modify assignments
CREATE POLICY "Admins can update lotes_seguridad"
ON public.lotes_seguridad
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.lotes l
        JOIN public.eventos e ON l.uuid_evento = e.id
        WHERE l.id = lotes_seguridad.uuid_lote
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- DELETE: Only admins can remove assignments
CREATE POLICY "Admins can delete lotes_seguridad"
ON public.lotes_seguridad
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.lotes l
        JOIN public.eventos e ON l.uuid_evento = e.id
        WHERE l.id = lotes_seguridad.uuid_lote
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- ============================================
-- SECTION 4: RPC Function - Check Scanning Permission
-- ============================================

-- Function to check if a security person can scan a specific invitado
-- Returns success: true if allowed, or error message with lote name if not allowed
CREATE OR REPLACE FUNCTION public.check_seguridad_can_scan(
    p_qr_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_invitado_id UUID;
    v_invitado_lote UUID;
    v_invitado_club UUID;
    v_lote_nombre TEXT;
    v_is_assigned BOOLEAN;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no autenticado'
        );
    END IF;

    -- Get user role and club
    SELECT p.rol, p.uuid_club INTO v_user_role, v_user_club
    FROM public.personal p
    WHERE p.id = v_user_id AND p.activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado o inactivo'
        );
    END IF;

    IF v_user_role != 'seguridad' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo personal de seguridad puede escanear QR'
        );
    END IF;

    -- Find invitado by QR code
    SELECT i.id, i.uuid_lote, e.uuid_club
    INTO v_invitado_id, v_invitado_lote, v_invitado_club
    FROM public.invitados i
    JOIN public.eventos e ON i.uuid_evento = e.id
    WHERE i.qr_code = p_qr_code;

    IF v_invitado_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitado no encontrado'
        );
    END IF;

    -- Check club match
    IF v_invitado_club != v_user_club THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tienes permiso para este invitado'
        );
    END IF;

    -- If invitado has no lote assigned, allow scan (backward compatibility)
    IF v_invitado_lote IS NULL THEN
        RETURN json_build_object(
            'success', true,
            'invitado_id', v_invitado_id,
            'message', 'Invitado sin lote asignado - escaneo permitido'
        );
    END IF;

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
            'lote_nombre', v_lote_nombre,
            'invitado_id', v_invitado_id
        );
    END IF;

    -- All checks passed
    RETURN json_build_object(
        'success', true,
        'invitado_id', v_invitado_id,
        'lote_nombre', v_lote_nombre,
        'message', 'Escaneo autorizado'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_seguridad_can_scan(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_seguridad_can_scan IS 'Valida si el seguridad actual puede escanear un invitado específico por QR. Retorna error con nombre del lote si no está asignado.';

-- ============================================
-- SECTION 5: Updated Trigger for updated_at
-- ============================================

-- Ensure updated_at trigger exists for lotes_seguridad
CREATE TRIGGER trigger_update_lotes_seguridad_updated_at
    BEFORE UPDATE ON public.lotes_seguridad
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the migration worked:
/*

-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'lotes_seguridad';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'lotes_seguridad';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'lotes_seguridad';

-- Check triggers exist
SELECT * FROM information_schema.triggers WHERE event_object_table = 'lotes_seguridad';

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'lotes_seguridad';

-- Test assignment (replace with actual UUIDs from your database)
-- INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
-- VALUES ('lote-uuid-here', 'seguridad-uuid-here');

-- Test check_seguridad_can_scan function
-- SELECT public.check_seguridad_can_scan('test-qr-code-here');

*/

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop function
DROP FUNCTION IF EXISTS public.check_seguridad_can_scan(TEXT);

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_validate_lotes_seguridad_role ON public.lotes_seguridad;
DROP FUNCTION IF EXISTS validate_lotes_seguridad_role();

-- Drop table (will cascade to delete all assignments)
DROP TABLE IF EXISTS public.lotes_seguridad CASCADE;
*/
