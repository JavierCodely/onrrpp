-- =============================================
-- Migration: 020 - RLS Policies Consolidated (FINAL VERSION)
-- Description: Complete RLS policies for all tables without recursion issues
-- Dependencies: 002-007, 018_update_invitados_ubicacion.sql
-- Version: 3.0 CONSOLIDATED
-- Consolidates: 007_create_rls_policies.sql + 015_fix_rls_policies_ubicacion.sql
--               + 016_fix_all_rls_policies.sql + 017_fix_rls_recursion.sql
-- Changes from original:
--   - Fixed ubicacion references to use departamento/localidad
--   - Removed recursive WITH CHECK self-references to prevent infinite recursion
--   - Simplified RRPP update policy - field validation handled by application layer
--   - Simplified Seguridad update policy - no recursive field checks
-- =============================================

-- ========================================
-- CLUBS POLICIES (unchanged from original)
-- ========================================

-- Users can only see their own club
DROP POLICY IF EXISTS "Users can view their own club" ON public.clubs;
CREATE POLICY "Users can view their own club"
ON public.clubs
FOR SELECT
USING (id = public.get_current_user_club());

-- No one can insert/update/delete clubs directly (admin operation)
DROP POLICY IF EXISTS "Only service role can manage clubs" ON public.clubs;
CREATE POLICY "Only service role can manage clubs"
ON public.clubs
FOR ALL
USING (false);

-- ========================================
-- PERSONAL POLICIES (unchanged from original)
-- ========================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.personal;
CREATE POLICY "Users can view their own profile"
ON public.personal
FOR SELECT
USING (id = auth.uid());

-- Users can view other personal from same club
DROP POLICY IF EXISTS "Users can view personal from same club" ON public.personal;
CREATE POLICY "Users can view personal from same club"
ON public.personal
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- Users can update their own profile (except role and club)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.personal;
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
-- EVENTOS POLICIES (unchanged from original)
-- ========================================

-- Users can view eventos from their club
DROP POLICY IF EXISTS "Users can view eventos from their club" ON public.eventos;
CREATE POLICY "Users can view eventos from their club"
ON public.eventos
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- Only admins can create eventos
DROP POLICY IF EXISTS "Only admins can create eventos" ON public.eventos;
CREATE POLICY "Only admins can create eventos"
ON public.eventos
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
    AND created_by = auth.uid()
);

-- Only admins can update their own eventos
DROP POLICY IF EXISTS "Only admins can update their own eventos" ON public.eventos;
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
DROP POLICY IF EXISTS "Only admins can delete their own eventos" ON public.eventos;
CREATE POLICY "Only admins can delete their own eventos"
ON public.eventos
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND created_by = auth.uid()
    AND uuid_club = public.get_current_user_club()
);

-- ========================================
-- INVITADOS POLICIES (FIXED - No recursion)
-- ========================================

-- Drop ALL existing policies on invitados
DROP POLICY IF EXISTS "Users can view invitados from their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can insert invitados to their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can update their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can delete their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

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
-- Field validation (preventing ingresado/fecha_ingreso changes) handled by application layer
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

-- Policy 5: Seguridad can update invitados (specifically ingresado status)
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
COMMENT ON POLICY "Users can view their own club" ON public.clubs
IS 'Usuarios solo pueden ver su propio club';

COMMENT ON POLICY "Users can view invitados from their club eventos" ON public.invitados
IS 'Usuarios pueden ver invitados de eventos de su club';

COMMENT ON POLICY "RRPP can insert invitados to their club eventos" ON public.invitados
IS 'RRPP pueden crear invitados en eventos de su club';

COMMENT ON POLICY "RRPP can update their own invitados" ON public.invitados
IS 'RRPP pueden actualizar sus propios invitados (validación de campos en capa de aplicación)';

COMMENT ON POLICY "RRPP can delete their own invitados" ON public.invitados
IS 'RRPP pueden eliminar sus propios invitados';

COMMENT ON POLICY "Seguridad can update ingresado status" ON public.invitados
IS 'Seguridad puede actualizar invitados de su club (validación de campos en capa de aplicación)';

-- ========================================
-- IMPORTANT NOTE
-- ========================================
-- Field-level validation (e.g., preventing RRPP from changing ingresado/fecha_ingreso)
-- is now handled by the application layer to avoid RLS recursion issues.
-- This is a more scalable and maintainable approach.
