-- =============================================
-- Migration: 018 - Update Invitados Ubicacion Fields
-- Description: Replace single ubicacion field with departamento and localidad
-- Dependencies: 005_create_invitados.sql, 007_create_rls_policies.sql, 017_create_ubicaciones.sql
-- Version: 1.0 (Consolidated from 014_update_invitados_ubicacion.sql)
-- =============================================

-- Step 1: Drop the RLS policy that depends on ubicacion column
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- Step 2: Drop old ubicacion column
ALTER TABLE public.invitados
DROP COLUMN IF EXISTS ubicacion;

-- Step 3: Add new ubicacion fields
ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS departamento TEXT,
ADD COLUMN IF NOT EXISTS localidad TEXT;

-- Step 4: Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_invitados_departamento ON public.invitados (departamento);
CREATE INDEX IF NOT EXISTS idx_invitados_localidad ON public.invitados (localidad);

-- Step 5: Recreate the RLS policy without ubicacion reference
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
    AND qr_code = (SELECT qr_code FROM public.invitados WHERE id = invitados.id)
);

-- Add comments
COMMENT ON COLUMN public.invitados.departamento IS 'Departamento de Misiones (municipio)';
COMMENT ON COLUMN public.invitados.localidad IS 'Localidad del invitado';
