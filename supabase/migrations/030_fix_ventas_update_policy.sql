-- =============================================
-- Migration: 030 - Fix Ventas UPDATE RLS Policies
-- Description: Add WITH CHECK clause to allow updating uuid_lote
-- =============================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "RRPP can update their ventas" ON public.ventas;
DROP POLICY IF EXISTS "Admins can update ventas" ON public.ventas;

-- RLS Policy: RRPP can update their own ventas
CREATE POLICY "RRPP can update their ventas"
ON public.ventas
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
)
WITH CHECK (
    -- Ensure the RRPP doesn't change ownership of the venta
    id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    AND uuid_invitado IN (
        SELECT id FROM public.invitados
        WHERE id_rrpp = auth.uid()
    )
);

-- RLS Policy: Admins can update all ventas of their club
CREATE POLICY "Admins can update ventas"
ON public.ventas
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
)
WITH CHECK (
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);
