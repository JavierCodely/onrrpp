-- =============================================
-- Migration: 032 - Add Grupos to Personal and Lotes
-- Description: Sistema de grupos (A, B, C, D) para organización de RRPPs y lotes
-- Dependencies: 003_create_personal.sql, 012_create_lotes.sql
-- Version: 1.0 (Consolidated from 030_add_grupos_to_personal_and_lotes.sql)
-- =============================================

-- ========================================
-- STEP 1: Create grupo_type enum
-- ========================================

CREATE TYPE grupo_type AS ENUM ('A', 'B', 'C', 'D');

COMMENT ON TYPE grupo_type IS 'Grupos organizacionales: A, B, C, D para segmentar RRPPs y lotes';

-- ========================================
-- STEP 2: Add grupo column to personal table
-- ========================================

-- Agregar columna grupo a personal
ALTER TABLE public.personal
ADD COLUMN IF NOT EXISTS grupo grupo_type;

-- Crear índice para mejorar performance de queries por grupo
CREATE INDEX IF NOT EXISTS idx_personal_grupo ON public.personal(grupo);
CREATE INDEX IF NOT EXISTS idx_personal_rol_grupo ON public.personal(rol, grupo);

-- Agregar comentarios
COMMENT ON COLUMN public.personal.grupo IS 'Grupo organizacional (A, B, C, D). NULL solo para rol seguridad. Requerido para admin y rrpp.';

-- ========================================
-- STEP 3: Add grupo column to lotes table
-- ========================================

-- Agregar columna grupo a lotes
ALTER TABLE public.lotes
ADD COLUMN IF NOT EXISTS grupo grupo_type;

-- Crear índice para filtrado eficiente
CREATE INDEX IF NOT EXISTS idx_lotes_grupo ON public.lotes(grupo);
CREATE INDEX IF NOT EXISTS idx_lotes_evento_grupo ON public.lotes(uuid_evento, grupo);

-- Agregar comentario
COMMENT ON COLUMN public.lotes.grupo IS 'Grupo que puede ver este lote (A, B, C, D). NULL = visible para todos los grupos.';

-- ========================================
-- STEP 4: Update existing data BEFORE adding constraint
-- ========================================

-- IMPORTANTE: Asignar grupo por defecto a usuarios existentes
-- Asignar grupo A por defecto a todos los RRPPs existentes sin grupo
UPDATE public.personal
SET grupo = 'A'
WHERE rol = 'rrpp' AND grupo IS NULL;

-- Asignar grupo A por defecto a todos los Admins existentes sin grupo
UPDATE public.personal
SET grupo = 'A'
WHERE rol = 'admin' AND grupo IS NULL;

-- Los usuarios con rol seguridad quedan con grupo NULL

-- ========================================
-- STEP 5: Add constraint to personal
-- ========================================

-- Constraint: grupo debe ser NOT NULL para admin y rrpp
ALTER TABLE public.personal
DROP CONSTRAINT IF EXISTS grupo_requerido_para_rrpp_admin;

ALTER TABLE public.personal
ADD CONSTRAINT grupo_requerido_para_rrpp_admin CHECK (
    (rol = 'seguridad' AND grupo IS NULL) OR
    (rol IN ('admin', 'rrpp') AND grupo IS NOT NULL) OR
    (rol = 'seguridad' AND grupo IS NOT NULL)
);

COMMENT ON CONSTRAINT grupo_requerido_para_rrpp_admin ON public.personal IS 'Grupo es obligatorio para admin y rrpp. Puede ser NULL solo para seguridad.';

-- ========================================
-- STEP 6: Update RLS policies for lotes
-- ========================================

-- Eliminar política antigua de visualización de lotes
DROP POLICY IF EXISTS "Users can view lotes of their club" ON public.lotes;
DROP POLICY IF EXISTS "RRPPs can view lotes of their grupo or without grupo" ON public.lotes;

-- Nueva política: RRPPs solo ven lotes de su grupo (o sin grupo)
CREATE POLICY "RRPPs can view lotes of their grupo or without grupo"
ON public.lotes
FOR SELECT
USING (
    -- Evento pertenece al club del usuario
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    AND (
        -- Admin y Seguridad ven todos los lotes
        public.get_current_user_role() IN ('admin', 'seguridad')
        OR
        -- RRPP ve solo lotes de su grupo o lotes sin grupo asignado
        (
            public.get_current_user_role() = 'rrpp'
            AND (
                grupo IS NULL
                OR grupo = (SELECT grupo FROM public.personal WHERE id = auth.uid())
            )
        )
    )
);

COMMENT ON POLICY "RRPPs can view lotes of their grupo or without grupo" ON public.lotes IS
'Admin y Seguridad ven todos los lotes. RRPP solo ve lotes de su grupo o sin grupo asignado.';

-- ========================================
-- STEP 7: Add function to get current user grupo
-- ========================================

-- Función helper para obtener el grupo del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_grupo()
RETURNS grupo_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT grupo
    FROM public.personal
    WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_grupo() IS 'Retorna el grupo del usuario autenticado. NULL si es seguridad o no tiene grupo.';

-- ========================================
-- STEP 8: Add validation function
-- ========================================

-- Función para validar que un lote pertenece al grupo del usuario
CREATE OR REPLACE FUNCTION public.check_lote_grupo_match(lote_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lote_grupo grupo_type;
    user_grupo grupo_type;
    user_rol user_role;
BEGIN
    -- Obtener grupo del lote
    SELECT grupo INTO lote_grupo
    FROM public.lotes
    WHERE id = lote_id;

    -- Obtener grupo y rol del usuario
    SELECT grupo, rol INTO user_grupo, user_rol
    FROM public.personal
    WHERE id = auth.uid();

    -- Admin y Seguridad pueden acceder a cualquier lote
    IF user_rol IN ('admin', 'seguridad') THEN
        RETURN TRUE;
    END IF;

    -- Si el lote no tiene grupo asignado, todos los RRPPs pueden verlo
    IF lote_grupo IS NULL THEN
        RETURN TRUE;
    END IF;

    -- RRPP solo puede ver lotes de su grupo
    IF user_rol = 'rrpp' AND lote_grupo = user_grupo THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.check_lote_grupo_match(UUID) IS 'Verifica si el usuario puede acceder a un lote según su grupo y rol.';

-- ========================================
-- STEP 9: Add trigger to validate grupo on insert/update
-- ========================================

-- Trigger function para validar grupo en personal
CREATE OR REPLACE FUNCTION validate_personal_grupo()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es RRPP o Admin, grupo debe ser NOT NULL
    IF NEW.rol IN ('admin', 'rrpp') AND NEW.grupo IS NULL THEN
        RAISE EXCEPTION 'El rol % requiere un grupo asignado (A, B, C, D)', NEW.rol;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_personal_grupo() IS 'Valida que admin y rrpp tengan grupo asignado';

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_validate_personal_grupo ON public.personal;
CREATE TRIGGER trigger_validate_personal_grupo
BEFORE INSERT OR UPDATE ON public.personal
FOR EACH ROW
EXECUTE FUNCTION validate_personal_grupo();

-- ========================================
-- STEP 10: Grant permissions
-- ========================================

-- Asegurar que los usuarios autenticados pueden ejecutar las funciones
GRANT EXECUTE ON FUNCTION public.get_current_user_grupo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_lote_grupo_match(UUID) TO authenticated;

-- ========================================
-- FINAL NOTES
-- ========================================

-- IMPORTANTE: Después de ejecutar esta migración:
-- 1. Todos los nuevos usuarios RRPP y Admin DEBEN tener un grupo asignado (A, B, C, D)
-- 2. Los usuarios Seguridad pueden tener grupo NULL
-- 3. Los lotes pueden tener grupo NULL (visible para todos) o un grupo específico
-- 4. RRPPs solo verán lotes de su grupo o lotes sin grupo
-- 5. Admin y Seguridad verán todos los lotes sin restricción

-- Para asignar grupos a usuarios existentes, ejecutar:
-- UPDATE public.personal SET grupo = 'A' WHERE rol = 'rrpp' AND id = 'uuid-del-usuario';

-- Para crear lotes con grupo específico:
-- INSERT INTO public.lotes (nombre, cantidad_maxima, precio, uuid_evento, grupo)
-- VALUES ('Lote Grupo A', 100, 50, 'uuid-evento', 'A');

-- Para crear lotes visibles para todos:
-- INSERT INTO public.lotes (nombre, cantidad_maxima, precio, uuid_evento, grupo)
-- VALUES ('Lote General', 200, 30, 'uuid-evento', NULL);
