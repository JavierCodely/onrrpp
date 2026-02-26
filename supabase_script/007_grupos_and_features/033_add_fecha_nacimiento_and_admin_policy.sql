-- =============================================
-- Migration: 033 - Add Fecha Nacimiento and Admin Update Policy
-- Description: Agregar campo fecha_nacimiento a personal, calcular edad automáticamente
--              y política para que admins puedan editar empleados
-- Dependencies: 003_create_personal.sql, 020_rls_policies_consolidated.sql
-- Version: 1.0 (Consolidated from 031_add_fecha_cumpleanos_and_admin_update_policy.sql)
-- =============================================

-- ========================================
-- STEP 1: Add fecha_nacimiento column to personal table
-- ========================================

ALTER TABLE public.personal
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

COMMENT ON COLUMN public.personal.fecha_nacimiento IS 'Fecha de nacimiento del personal - la edad se calcula automáticamente';

-- ========================================
-- STEP 2: Create function to calculate age from fecha_nacimiento
-- ========================================

CREATE OR REPLACE FUNCTION calculate_edad_from_fecha_nacimiento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_nacimiento IS NOT NULL THEN
        NEW.edad := DATE_PART('year', AGE(NEW.fecha_nacimiento));
    ELSE
        NEW.edad := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_edad_from_fecha_nacimiento() IS 'Calcula automáticamente la edad basándose en fecha_nacimiento';

-- ========================================
-- STEP 3: Create trigger to auto-calculate edad
-- ========================================

DROP TRIGGER IF EXISTS trigger_calculate_edad ON public.personal;

CREATE TRIGGER trigger_calculate_edad
BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.personal
FOR EACH ROW
EXECUTE FUNCTION calculate_edad_from_fecha_nacimiento();

COMMENT ON TRIGGER trigger_calculate_edad ON public.personal IS 'Trigger que calcula edad automáticamente al insertar/actualizar fecha_nacimiento';

-- ========================================
-- STEP 4: Add RLS Policy for Admins to update other personal
-- ========================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update personal from their club" ON public.personal;

-- Policy: Admins can update personal from their club
CREATE POLICY "Admins can update personal from their club"
ON public.personal
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
)
WITH CHECK (
    -- Admin no puede cambiar el club
    uuid_club = public.get_current_user_club()
);

COMMENT ON POLICY "Admins can update personal from their club" ON public.personal IS
'Los admins pueden actualizar nombre, apellido, edad, sexo, grupo, activo y fecha_nacimiento de empleados de su club';

-- ========================================
-- FINAL NOTES
-- ========================================

-- IMPORTANTE: Con esta migración:
-- 1. Se agrega campo fecha_nacimiento (DATE) a la tabla personal
-- 2. La edad se calcula AUTOMÁTICAMENTE desde fecha_nacimiento mediante trigger
-- 3. Los admins pueden actualizar datos de empleados de su club
-- 4. Los empleados pueden seguir actualizando su propio perfil (excepto rol y club)
-- 5. fecha_nacimiento y edad pueden ser NULL

-- Ejemplo de uso:
-- UPDATE public.personal SET fecha_nacimiento = '1990-01-15' WHERE id = 'uuid-del-usuario';
-- La edad se calculará automáticamente (35 años en 2025)

-- Para recalcular edad de usuarios existentes que ya tienen edad manual:
-- UPDATE public.personal
-- SET fecha_nacimiento = CURRENT_DATE - (edad || ' years')::INTERVAL
-- WHERE edad IS NOT NULL AND fecha_nacimiento IS NULL;
