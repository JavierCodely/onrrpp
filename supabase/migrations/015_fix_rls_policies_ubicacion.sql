-- =============================================
-- Migration: 015 - Fix RLS Policies Ubicacion Reference
-- Description: Update RLS policies to use departamento/localidad instead of ubicacion
-- =============================================

-- Drop old policy that references ubicacion column
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- Recreate policy with correct column references
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

COMMENT ON POLICY "Seguridad can update ingresado status" ON public.invitados IS 'Permite a Seguridad actualizar solo ingresado y fecha_ingreso';
