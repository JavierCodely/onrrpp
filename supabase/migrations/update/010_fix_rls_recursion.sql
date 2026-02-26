-- =============================================
-- Update Migration: 010 - Fix RLS Infinite Recursion
-- Description: Corregir recursión infinita en política de UPDATE de invitados
-- =============================================

-- El problema: La política actual hace SELECT sobre la misma tabla invitados
-- dentro de WITH CHECK, causando recursión infinita.

-- PASO 1: Eliminar la política problemática
DROP POLICY IF EXISTS "RRPP can update their own invitados" ON public.invitados;
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- PASO 2: Crear función helper que verifica sin activar RLS
CREATE OR REPLACE FUNCTION public.check_invitado_unchanged_fields(
    p_invitado_id UUID,
    p_new_ingresado BOOLEAN,
    p_new_fecha_ingreso TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_ingresado BOOLEAN;
    v_old_fecha_ingreso TIMESTAMPTZ;
BEGIN
    -- Obtener valores antiguos SIN activar RLS (SECURITY DEFINER)
    SELECT ingresado, fecha_ingreso
    INTO v_old_ingresado, v_old_fecha_ingreso
    FROM public.invitados
    WHERE id = p_invitado_id;

    -- Verificar que no hayan cambiado
    RETURN (
        (v_old_ingresado IS NOT DISTINCT FROM p_new_ingresado) AND
        (v_old_fecha_ingreso IS NOT DISTINCT FROM p_new_fecha_ingreso)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Recrear política de RRPP sin recursión
-- RRPP puede actualizar sus propios invitados, excepto ingresado y fecha_ingreso
CREATE POLICY "RRPP can update their own invitados"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
)
WITH CHECK (
    id_rrpp = auth.uid()
    AND public.check_invitado_unchanged_fields(id, ingresado, fecha_ingreso)
);

-- PASO 4: Recrear política de Seguridad sin recursión
-- Crear función helper para Seguridad que verifica que solo cambien ingresado/fecha_ingreso
CREATE OR REPLACE FUNCTION public.check_only_ingreso_changed(
    p_invitado_id UUID,
    p_new_nombre TEXT,
    p_new_apellido TEXT,
    p_new_edad INTEGER,
    p_new_ubicacion TEXT,
    p_new_dni TEXT,
    p_new_sexo sexo_type,
    p_new_uuid_evento UUID,
    p_new_uuid_lote UUID,
    p_new_id_rrpp UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_old RECORD;
BEGIN
    -- Obtener valores antiguos SIN activar RLS
    SELECT nombre, apellido, edad, ubicacion, dni, sexo, uuid_evento, uuid_lote, id_rrpp
    INTO v_old
    FROM public.invitados
    WHERE id = p_invitado_id;

    -- Verificar que SOLO ingresado y fecha_ingreso pueden cambiar
    RETURN (
        v_old.nombre IS NOT DISTINCT FROM p_new_nombre AND
        v_old.apellido IS NOT DISTINCT FROM p_new_apellido AND
        v_old.edad IS NOT DISTINCT FROM p_new_edad AND
        v_old.ubicacion IS NOT DISTINCT FROM p_new_ubicacion AND
        v_old.dni IS NOT DISTINCT FROM p_new_dni AND
        v_old.sexo IS NOT DISTINCT FROM p_new_sexo AND
        v_old.uuid_evento IS NOT DISTINCT FROM p_new_uuid_evento AND
        v_old.uuid_lote IS NOT DISTINCT FROM p_new_uuid_lote AND
        v_old.id_rrpp IS NOT DISTINCT FROM p_new_id_rrpp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    public.check_only_ingreso_changed(
        id, nombre, apellido, edad, ubicacion, dni, sexo, uuid_evento, uuid_lote, id_rrpp
    )
);

-- PASO 5: Comentarios
COMMENT ON FUNCTION public.check_invitado_unchanged_fields IS
'SECURITY DEFINER: Verifica que ingresado y fecha_ingreso no cambien (sin RLS)';

COMMENT ON FUNCTION public.check_only_ingreso_changed IS
'SECURITY DEFINER: Verifica que solo ingresado/fecha_ingreso cambien para Seguridad (sin RLS)';

-- PASO 6: Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ POLÍTICAS RLS CORREGIDAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Problema resuelto: Recursión infinita eliminada';
    RAISE NOTICE 'RRPP ahora puede editar invitados incluyendo lote';
    RAISE NOTICE 'Seguridad solo puede cambiar ingresado/fecha_ingreso';
    RAISE NOTICE '========================================';
END $$;
