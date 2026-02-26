-- =============================================
-- Migration: 037 - Fix Admin View All Grupos
-- Description: Asegurar que Admin pueda ver personal e invitados de TODOS los grupos
-- =============================================

-- ========================================
-- STEP 1: Verificar política actual de personal
-- ========================================

-- La política actual de personal es:
-- CREATE POLICY "Users can view personal from same club"
-- ON public.personal
-- FOR SELECT
-- USING (uuid_club = public.get_current_user_club());

-- Esta política NO filtra por grupo, solo por club.
-- Esto está correcto y debería permitir que Admin vea todo el personal.

-- ========================================
-- STEP 2: Verificar política actual de invitados
-- ========================================

-- La política actual de invitados es:
-- CREATE POLICY "Users can view invitados from their club eventos"
-- ON public.invitados
-- FOR SELECT
-- USING (
--     EXISTS (
--         SELECT 1
--         FROM public.eventos e
--         WHERE e.id = invitados.uuid_evento
--         AND e.uuid_club = public.get_current_user_club()
--     )
-- );

-- Esta política NO filtra por grupo, solo por club.
-- Esto está correcto y debería permitir que Admin vea todos los invitados.

-- ========================================
-- STEP 3: El problema NO está en las políticas RLS
-- ========================================

-- Las políticas RLS están correctas. El problema podría estar en:
-- 1. Cómo se están construyendo las queries desde el cliente
-- 2. Algún filtro implícito que se está aplicando

-- Para verificar, ejecuta este query en SQL Editor:
SELECT
  p.grupo as grupo_rrpp,
  COUNT(*) as total_invitados
FROM public.invitados i
INNER JOIN public.personal p ON p.id = i.id_rrpp
WHERE p.activo = true
GROUP BY p.grupo
ORDER BY p.grupo;

-- Si este query muestra:
-- grupo_rrpp | total_invitados
-- -----------|----------------
-- A          | 1000
-- C          | 55
--
-- Entonces las RLS policies están funcionando correctamente y el problema
-- está en cómo se están construyendo las queries desde JavaScript.

-- Si solo muestra grupo A, entonces hay un problema con las RLS policies.

-- ========================================
-- STEP 4: Solución alternativa (si es necesario)
-- ========================================

-- Si las políticas RLS están causando problemas, podemos crear una función
-- que bypass las RLS policies para Admin:

CREATE OR REPLACE FUNCTION public.get_all_invitados_admin(
  p_evento_id UUID DEFAULT NULL,
  p_rrpp_id UUID DEFAULT NULL,
  p_sexo sexo_type DEFAULT NULL,
  p_departamento TEXT DEFAULT NULL,
  p_grupo grupo_type DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  apellido TEXT,
  edad INTEGER,
  sexo sexo_type,
  departamento TEXT,
  localidad TEXT,
  ingresado BOOLEAN,
  fecha_ingreso TIMESTAMP WITH TIME ZONE,
  uuid_lote UUID,
  id_rrpp UUID,
  rrpp_grupo grupo_type,
  rrpp_nombre TEXT,
  rrpp_apellido TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role user_role;
  v_user_club UUID;
BEGIN
  -- Verificar que el usuario es Admin
  SELECT rol, uuid_club INTO v_user_role, v_user_club
  FROM public.personal
  WHERE personal.id = auth.uid();

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo Admin puede usar esta función';
  END IF;

  -- Retornar todos los invitados del club sin filtrar por grupo
  RETURN QUERY
  SELECT
    i.id,
    i.nombre,
    i.apellido,
    i.edad,
    i.sexo,
    i.departamento,
    i.localidad,
    i.ingresado,
    i.fecha_ingreso,
    i.uuid_lote,
    i.id_rrpp,
    p.grupo as rrpp_grupo,
    p.nombre as rrpp_nombre,
    p.apellido as rrpp_apellido
  FROM public.invitados i
  INNER JOIN public.personal p ON p.id = i.id_rrpp
  INNER JOIN public.eventos e ON e.id = i.uuid_evento
  WHERE e.uuid_club = v_user_club
    AND p.activo = true
    AND (p_evento_id IS NULL OR i.uuid_evento = p_evento_id)
    AND (p_rrpp_id IS NULL OR i.id_rrpp = p_rrpp_id)
    AND (p_sexo IS NULL OR i.sexo = p_sexo)
    AND (p_departamento IS NULL OR i.departamento = p_departamento)
    AND (p_grupo IS NULL OR p.grupo = p_grupo);
END;
$$;

COMMENT ON FUNCTION public.get_all_invitados_admin IS 'Retorna todos los invitados del club para Admin, sin restricciones de grupo. SECURITY DEFINER bypasses RLS.';

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_all_invitados_admin TO authenticated;

-- ========================================
-- NOTAS FINALES
-- ========================================

-- Esta migración NO modifica las políticas RLS existentes.
-- Solo agrega una función helper que Admin puede usar para obtener
-- todos los invitados sin restricciones de grupo.

-- Si las políticas RLS están funcionando correctamente, esta función
-- NO es necesaria y el problema está en el código JavaScript.
