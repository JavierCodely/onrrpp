-- =============================================
-- Migration: 023 - Prevent Editing Checked-In Guests
-- Description: RRPP cannot edit invitados who already entered (ingresado = true)
-- Dependencies: 005_create_invitados.sql, 020_rls_policies_consolidated.sql
-- Version: 1.0 (Consolidated from 035_prevent_edit_ingresados_and_allow_rrpp_delete_ventas.sql)
-- =============================================

-- Drop existing UPDATE policy for RRPP on invitados
DROP POLICY IF EXISTS "RRPP can update their invitados" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can update their own invitados" ON public.invitados;

-- Create new policy that prevents editing invitados who already entered
CREATE POLICY "RRPP can update their own invitados"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
    -- Cannot edit invitados who already entered
    AND ingresado = false
)
WITH CHECK (
    id_rrpp = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
    -- Ensure they don't try to set ingresado = true (only seguridad can do that)
    AND ingresado = false
);

COMMENT ON POLICY "RRPP can update their own invitados" ON public.invitados IS
'RRPP pueden actualizar sus propios invitados SOLO si no han ingresado (ingresado = false)';
