-- =============================================
-- Migration: 043 - Clientes por club (uuid_club)
-- Description: Cada cliente pertenece a un club. Búsqueda por DNI y admin/clientes
--              solo ven clientes de su club. Al crear invitado, el cliente se crea
--              con el uuid_club del evento.
-- =============================================

-- STEP 1: Añadir columna uuid_club (nullable para backfill)
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS uuid_club UUID REFERENCES public.clubs(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.clientes.uuid_club IS 'Club al que pertenece el cliente; búsquedas y listados filtran por este club.';

-- STEP 2: Backfill uuid_club desde invitados+eventos o desde id_rrpp_creador
UPDATE public.clientes c
SET uuid_club = sub.uuid_club
FROM (
    SELECT DISTINCT ON (c2.id)
        c2.id AS cliente_id,
        e.uuid_club
    FROM public.clientes c2
    JOIN public.invitados i ON i.uuid_cliente = c2.id
    JOIN public.eventos e ON e.id = i.uuid_evento
    WHERE c2.uuid_club IS NULL
    ORDER BY c2.id, i.created_at ASC
) sub
WHERE c.id = sub.cliente_id;

UPDATE public.clientes c
SET uuid_club = p.uuid_club
FROM public.personal p
WHERE c.id_rrpp_creador = p.id
  AND c.uuid_club IS NULL;

-- Si aún queda alguno sin club (sin invitados y sin rrpp), asignar al primer club existente
UPDATE public.clientes c
SET uuid_club = (SELECT id FROM public.clubs ORDER BY created_at ASC LIMIT 1)
WHERE c.uuid_club IS NULL;

-- STEP 3: Hacer NOT NULL
ALTER TABLE public.clientes
ALTER COLUMN uuid_club SET NOT NULL;

-- STEP 4: Sustituir UNIQUE(dni) por UNIQUE(dni, uuid_club) para permitir mismo DNI en distintos clubs
ALTER TABLE public.clientes
DROP CONSTRAINT IF EXISTS clientes_dni_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_dni_uuid_club
ON public.clientes (dni, uuid_club);

-- Índice para filtros por club
CREATE INDEX IF NOT EXISTS idx_clientes_uuid_club ON public.clientes(uuid_club);

-- STEP 5: Actualizar trigger auto_create_or_find_cliente (buscar y crear por club del evento)
CREATE OR REPLACE FUNCTION auto_create_or_find_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cliente_id UUID;
    v_uuid_club UUID;
BEGIN
    SELECT e.uuid_club INTO v_uuid_club
    FROM public.eventos e
    WHERE e.id = NEW.uuid_evento;

    IF v_uuid_club IS NULL THEN
        RAISE EXCEPTION 'Evento no encontrado para uuid_evento %', NEW.uuid_evento;
    END IF;

    SELECT id INTO v_cliente_id
    FROM public.clientes
    WHERE dni = NEW.dni AND uuid_club = v_uuid_club;

    IF v_cliente_id IS NOT NULL THEN
        NEW.uuid_cliente := v_cliente_id;

        SELECT
            c.nombre,
            c.apellido,
            c.edad,
            c.sexo,
            c.departamento,
            c.localidad,
            c.fecha_nacimiento
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad,
            NEW.fecha_nacimiento
        FROM public.clientes c
        WHERE c.id = v_cliente_id;

        RAISE NOTICE 'Cliente existente encontrado (DNI: %, club: %). Datos autocompletados.', NEW.dni, v_uuid_club;

    ELSE
        INSERT INTO public.clientes (
            dni,
            nombre,
            apellido,
            edad,
            fecha_nacimiento,
            sexo,
            departamento,
            localidad,
            id_rrpp_creador,
            uuid_club
        ) VALUES (
            NEW.dni,
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.fecha_nacimiento,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad,
            NEW.id_rrpp,
            v_uuid_club
        )
        RETURNING id INTO v_cliente_id;

        NEW.uuid_cliente := v_cliente_id;

        RAISE NOTICE 'Nuevo cliente creado (DNI: %, club: %)', NEW.dni, v_uuid_club;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca cliente por DNI dentro del club del evento. Los clientes no se mezclan entre clubs.';

-- STEP 6: check_cliente_denegado solo devuelve cliente del club del usuario actual
DROP FUNCTION IF EXISTS public.check_cliente_denegado(TEXT);

CREATE OR REPLACE FUNCTION public.check_cliente_denegado(p_dni TEXT)
RETURNS TABLE (
    existe BOOLEAN,
    denegado BOOLEAN,
    cliente_id UUID,
    nombre TEXT,
    apellido TEXT,
    edad INTEGER,
    sexo TEXT,
    pais TEXT,
    provincia TEXT,
    departamento TEXT,
    localidad TEXT,
    denegado_razon TEXT,
    fecha_nacimiento DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        true AS existe,
        c.denegado,
        c.id AS cliente_id,
        c.nombre,
        c.apellido,
        c.edad,
        c.sexo::TEXT,
        NULL::TEXT AS pais,
        NULL::TEXT AS provincia,
        c.departamento,
        c.localidad,
        c.denegado_razon,
        c.fecha_nacimiento
    FROM public.clientes c
    WHERE c.dni = p_dni
      AND c.uuid_club = public.get_current_user_club();

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false AS existe,
            false AS denegado,
            NULL::UUID AS cliente_id,
            NULL::TEXT AS nombre,
            NULL::TEXT AS apellido,
            NULL::INTEGER AS edad,
            NULL::TEXT AS sexo,
            NULL::TEXT AS pais,
            NULL::TEXT AS provincia,
            NULL::TEXT AS departamento,
            NULL::TEXT AS localidad,
            NULL::TEXT AS denegado_razon,
            NULL::DATE AS fecha_nacimiento;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cliente_denegado(TEXT) TO authenticated;
COMMENT ON FUNCTION public.check_cliente_denegado IS 'Verifica si un cliente existe y está denegado por DNI; solo considera clientes del club del usuario actual.';

-- STEP 7: get_clientes_admin solo clientes del club actual
DROP FUNCTION IF EXISTS public.get_clientes_admin();

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
  WHERE c.uuid_club = public.get_current_user_club()
  ORDER BY c.apellido, c.nombre;
$$;

COMMENT ON FUNCTION public.get_clientes_admin IS
'Lista de clientes del club actual con contador de ingresos, flag de ingreso en eventos activos y fecha_nacimiento.';

-- STEP 8: RLS clientes - solo ver/gestionar clientes del propio club
DROP POLICY IF EXISTS "All users can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "RRPP and Admin can create clientes" ON public.clientes;
DROP POLICY IF EXISTS "RRPP and Admin can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin can delete clientes" ON public.clientes;

CREATE POLICY "Users can view clientes of their club"
ON public.clientes
FOR SELECT
USING (uuid_club = public.get_current_user_club());

CREATE POLICY "RRPP and Admin can create clientes for their club"
ON public.clientes
FOR INSERT
WITH CHECK (
    (public.check_user_has_role('rrpp'::user_role) OR public.check_user_has_role('admin'::user_role))
    AND uuid_club = public.get_current_user_club()
);

CREATE POLICY "RRPP and Admin can update clientes of their club"
ON public.clientes
FOR UPDATE
USING (
    (public.check_user_has_role('rrpp'::user_role) OR public.check_user_has_role('admin'::user_role))
    AND uuid_club = public.get_current_user_club()
);

CREATE POLICY "Admin can delete clientes of their club"
ON public.clientes
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- STEP 9: Vista y función cumpleaños solo del club actual
DROP VIEW IF EXISTS public.v_clientes_cumpleanios_hoy;

CREATE OR REPLACE VIEW public.v_clientes_cumpleanios_hoy
AS
SELECT
    c.id,
    c.dni,
    c.nombre,
    c.apellido,
    c.edad,
    c.fecha_nacimiento,
    c.sexo,
    c.departamento,
    c.localidad,
    c.id_rrpp_creador,
    c.uuid_club,
    c.created_at,
    c.updated_at
FROM public.clientes c
WHERE c.uuid_club = public.get_current_user_club()
  AND c.fecha_nacimiento IS NOT NULL
  AND EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE);

COMMENT ON VIEW public.v_clientes_cumpleanios_hoy IS 'Clientes del club actual que cumplen años hoy.';

DROP FUNCTION IF EXISTS public.get_clientes_cumpleanios_hoy();

CREATE OR REPLACE FUNCTION public.get_clientes_cumpleanios_hoy()
RETURNS SETOF public.clientes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT c.*
    FROM public.clientes c
    WHERE c.uuid_club = public.get_current_user_club()
      AND c.fecha_nacimiento IS NOT NULL
      AND EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE);
$$;

COMMENT ON FUNCTION public.get_clientes_cumpleanios_hoy IS 'Devuelve los clientes del club actual que cumplen años hoy.';
GRANT EXECUTE ON FUNCTION public.get_clientes_cumpleanios_hoy() TO authenticated;
