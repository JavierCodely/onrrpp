-- =============================================
-- Migration: 035 - Prevent editing checked-in guests and allow RRPP delete ventas
-- Description: RRPP cannot edit invitados who already entered (ingresado = true)
--              and RRPP can delete their own ventas when changing to free lote
-- =============================================

-- Drop existing UPDATE policy for RRPP on invitados
DROP POLICY IF EXISTS "RRPP can update their invitados" ON public.invitados;

-- Create new policy that prevents editing invitados who already entered
CREATE POLICY "RRPP can update their invitados"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    -- Cannot edit invitados who already entered
    AND ingresado = false
)
WITH CHECK (
    id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    -- Ensure they don't try to set ingresado = true (only seguridad can do that)
    AND ingresado = false
);

-- Add policy to allow RRPP to delete their own ventas
CREATE POLICY "RRPP can delete their ventas"
ON public.ventas
FOR DELETE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);
