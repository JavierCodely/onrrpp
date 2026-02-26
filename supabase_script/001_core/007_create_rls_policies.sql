-- =============================================
-- Migration: 007 - Create RLS Policies
-- Description: Row Level Security policies for multi-tenant isolation
-- Dependencies: 002-006
-- Version: 1.0 (Original)
-- =============================================

-- ========================================
-- CLUBS POLICIES
-- ========================================

-- Users can only see their own club
CREATE POLICY "Users can view their own club"
ON public.clubs
FOR SELECT
USING (id = public.get_current_user_club());

-- No one can insert/update/delete clubs directly (admin operation)
CREATE POLICY "Only service role can manage clubs"
ON public.clubs
FOR ALL
USING (false);

-- ========================================
-- PERSONAL POLICIES
-- ========================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.personal
FOR SELECT
USING (id = auth.uid());

-- Users can view other personal from same club
CREATE POLICY "Users can view personal from same club"
ON public.personal
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- Users can update their own profile (except role and club)
CREATE POLICY "Users can update their own profile"
ON public.personal
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND rol = (SELECT rol FROM public.personal WHERE id = auth.uid())
    AND uuid_club = (SELECT uuid_club FROM public.personal WHERE id = auth.uid())
);

-- ========================================
-- EVENTOS POLICIES
-- ========================================

-- Users can view eventos from their club
CREATE POLICY "Users can view eventos from their club"
ON public.eventos
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- Only admins can create eventos
CREATE POLICY "Only admins can create eventos"
ON public.eventos
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
    AND created_by = auth.uid()
);

-- Only admins can update their own eventos
CREATE POLICY "Only admins can update their own eventos"
ON public.eventos
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND created_by = auth.uid()
    AND uuid_club = public.get_current_user_club()
)
WITH CHECK (
    uuid_club = public.get_current_user_club()
    AND created_by = auth.uid()
);

-- Only admins can delete their own eventos
CREATE POLICY "Only admins can delete their own eventos"
ON public.eventos
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND created_by = auth.uid()
    AND uuid_club = public.get_current_user_club()
);

-- ========================================
-- INVITADOS POLICIES
-- ========================================

-- Users can view invitados from eventos in their club
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

-- RRPP can insert invitados to eventos in their club
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

-- RRPP can update their own invitados (not ingresado status)
CREATE POLICY "RRPP can update their own invitados"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
)
WITH CHECK (
    id_rrpp = auth.uid()
    AND ingresado = (SELECT ingresado FROM public.invitados WHERE id = invitados.id)
    AND fecha_ingreso = (SELECT fecha_ingreso FROM public.invitados WHERE id = invitados.id)
);

-- RRPP can delete their own invitados
CREATE POLICY "RRPP can delete their own invitados"
ON public.invitados
FOR DELETE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
);

-- Seguridad can update ingresado status
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
)
WITH CHECK (
    -- Only allow updating ingresado and fecha_ingreso
    nombre = (SELECT nombre FROM public.invitados WHERE id = invitados.id)
    AND apellido = (SELECT apellido FROM public.invitados WHERE id = invitados.id)
    AND edad = (SELECT edad FROM public.invitados WHERE id = invitados.id)
    AND ubicacion = (SELECT ubicacion FROM public.invitados WHERE id = invitados.id)
    AND dni = (SELECT dni FROM public.invitados WHERE id = invitados.id)
    AND sexo = (SELECT sexo FROM public.invitados WHERE id = invitados.id)
    AND uuid_evento = (SELECT uuid_evento FROM public.invitados WHERE id = invitados.id)
    AND id_rrpp = (SELECT id_rrpp FROM public.invitados WHERE id = invitados.id)
);
