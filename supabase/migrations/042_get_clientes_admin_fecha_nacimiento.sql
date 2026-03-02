-- =============================================
-- Migration: 042 - get_clientes_admin incluye fecha_nacimiento para filtro por cumpleaños
-- =============================================

-- Asegurar que clientes tenga fecha_nacimiento (por si no existe)
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Cambiar el tipo de retorno obliga a hacer DROP antes
DROP FUNCTION IF EXISTS public.get_clientes_admin();

-- Recrear get_clientes_admin con fecha_nacimiento
CREATE FUNCTION public.get_clientes_admin()
RETURNS TABLE (
  id UUID,
  dni TEXT,
  nombre TEXT,
  apellido TEXT,
  denegado BOOLEAN,
  veces_ingresado INTEGER,
  ingresado_activo BOOLEAN,
  fecha_nacimiento DATE
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.dni,
    c.nombre,
    c.apellido,
    c.denegado,
    COALESCE(cic.ingresos, 0)::INTEGER AS veces_ingresado,
    EXISTS (
      SELECT 1
      FROM public.invitados i
      JOIN public.eventos e ON e.id = i.uuid_evento
      WHERE i.uuid_cliente = c.id
        AND i.ingresado = true
        AND e.estado = true
        AND e.uuid_club = public.get_current_user_club()
    ) AS ingresado_activo,
    c.fecha_nacimiento
  FROM public.clientes c
  LEFT JOIN public.clientes_ingresos_por_club cic
    ON cic.uuid_cliente = c.id
   AND cic.uuid_club = public.get_current_user_club()
  ORDER BY c.apellido, c.nombre;
$$;

COMMENT ON FUNCTION public.get_clientes_admin IS
'Lista de clientes para admin del club actual con contador de ingresos, flag de ingreso en eventos activos y fecha_nacimiento para filtro por cumpleaños.';
