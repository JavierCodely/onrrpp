-- =============================================
-- Migration: 017 - Fix RLS Infinite Recursion
-- Description: Fix recursive policies by removing WITH CHECK self-references
-- =============================================

-- Drop ALL existing policies on invitados
DROP POLICY IF EXISTS "Users can view invitados from their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can insert invitados to their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can update their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can delete their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- ========================================
-- RECREATE POLICIES WITHOUT RECURSION
-- ========================================

-- Policy 1: Users can view invitados from eventos in their club
CREATE POLICY "Users can view invitados from their club eventos"
ON public.invitados
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- Policy 2: RRPP can insert invitados to eventos in their club
CREATE POLICY "RRPP can insert invitados to their club eventos"
ON public.invitados
FOR INSERT
WITH CHECK (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id = uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- Policy 3: RRPP can update their own invitados
-- SIMPLIFIED: No recursive checks, just ownership validation
CREATE POLICY "RRPP can update their own invitados"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- Policy 4: RRPP can delete their own invitados
CREATE POLICY "RRPP can delete their own invitados"
ON public.invitados
FOR DELETE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
);

-- Policy 5: Seguridad can update ingresado status
-- SIMPLIFIED: Only check permissions, field validation via application layer
CREATE POLICY "Seguridad can update ingresado status"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('seguridad'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
);

-- Add comments
COMMENT ON POLICY "Users can view invitados from their club eventos" ON public.invitados
IS 'Usuarios pueden ver invitados de eventos de su club';

COMMENT ON POLICY "RRPP can insert invitados to their club eventos" ON public.invitados
IS 'RRPP pueden crear invitados en eventos de su club';

COMMENT ON POLICY "RRPP can update their own invitados" ON public.invitados
IS 'RRPP pueden actualizar sus propios invitados';

COMMENT ON POLICY "RRPP can delete their own invitados" ON public.invitados
IS 'RRPP pueden eliminar sus propios invitados';

COMMENT ON POLICY "Seguridad can update ingresado status" ON public.invitados
IS 'Seguridad puede actualizar invitados de su club';
