-- =============================================
-- Migration: 016 - Fix ALL RLS Policies for Invitados
-- Description: Drop and recreate all invitados RLS policies without ubicacion references
-- =============================================

-- Drop ALL existing policies on invitados
DROP POLICY IF EXISTS "Users can view invitados from their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can insert invitados to their club eventos" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can update their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "RRPP can delete their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- ========================================
-- RECREATE ALL POLICIES CORRECTLY
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

-- Policy 3: RRPP can update their own invitados (not ingresado/fecha_ingreso)
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

-- Policy 4: RRPP can delete their own invitados
CREATE POLICY "RRPP can delete their own invitados"
ON public.invitados
FOR DELETE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
);

-- Policy 5: Seguridad can update ONLY ingresado and fecha_ingreso
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
    AND departamento = (SELECT departamento FROM public.invitados WHERE id = invitados.id)
    AND localidad = (SELECT localidad FROM public.invitados WHERE id = invitados.id)
    AND dni = (SELECT dni FROM public.invitados WHERE id = invitados.id)
    AND sexo = (SELECT sexo FROM public.invitados WHERE id = invitados.id)
    AND uuid_evento = (SELECT uuid_evento FROM public.invitados WHERE id = invitados.id)
    AND id_rrpp = (SELECT id_rrpp FROM public.invitados WHERE id = invitados.id)
    AND uuid_lote = (SELECT uuid_lote FROM public.invitados WHERE id = invitados.id)
    AND profile_image_url = (SELECT profile_image_url FROM public.invitados WHERE id = invitados.id)
);

-- Add comments
COMMENT ON POLICY "Users can view invitados from their club eventos" ON public.invitados
IS 'Usuarios pueden ver invitados de eventos de su club';

COMMENT ON POLICY "RRPP can insert invitados to their club eventos" ON public.invitados
IS 'RRPP pueden crear invitados en eventos de su club';

COMMENT ON POLICY "RRPP can update their own invitados" ON public.invitados
IS 'RRPP pueden actualizar sus invitados (excepto ingresado/fecha_ingreso)';

COMMENT ON POLICY "RRPP can delete their own invitados" ON public.invitados
IS 'RRPP pueden eliminar sus propios invitados';

COMMENT ON POLICY "Seguridad can update ingresado status" ON public.invitados
IS 'Seguridad puede actualizar solo ingresado y fecha_ingreso';
