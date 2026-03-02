-- =============================================
-- Migration: 040 - Fecha nacimiento en invitados + notificación cumpleaños
-- Description: Añade fecha_nacimiento a invitados, actualiza triggers cliente,
--              vista/función para clientes que cumplen años hoy
-- Dependencies: clientes (fecha_nacimiento), invitados, triggers 056
-- =============================================

-- ========================================
-- STEP 1: Añadir fecha_nacimiento a invitados
-- ========================================

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

COMMENT ON COLUMN public.invitados.fecha_nacimiento IS 'Fecha de nacimiento del invitado; se sincroniza con clientes';

-- ========================================
-- STEP 2: Actualizar trigger auto_create_or_find_cliente (incluir fecha_nacimiento)
-- ========================================

CREATE OR REPLACE FUNCTION auto_create_or_find_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cliente_id UUID;
BEGIN
    SELECT id INTO v_cliente_id
    FROM public.clientes
    WHERE dni = NEW.dni;

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
        -- Opcional: si clientes tiene pais/provincia, descomentar y añadir NEW.pais, NEW.provincia al INTO
        -- NEW.pais := (SELECT pais FROM public.clientes WHERE id = v_cliente_id);
        -- NEW.provincia := (SELECT provincia FROM public.clientes WHERE id = v_cliente_id);

        RAISE NOTICE 'Cliente existente encontrado (DNI: %). Datos autocompletados.', NEW.dni;

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
            id_rrpp_creador
        ) VALUES (
            NEW.dni,
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.fecha_nacimiento,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad,
            NEW.id_rrpp
        )
        RETURNING id INTO v_cliente_id;

        NEW.uuid_cliente := v_cliente_id;

        RAISE NOTICE 'Nuevo cliente creado (DNI: %)', NEW.dni;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca cliente por DNI. Sincroniza fecha_nacimiento con clientes.';

-- ========================================
-- STEP 3: Actualizar sync_cliente_data_on_invitado_update (incluir fecha_nacimiento)
-- ========================================

CREATE OR REPLACE FUNCTION sync_cliente_data_on_invitado_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.uuid_cliente IS NOT NULL AND (
        OLD.nombre IS DISTINCT FROM NEW.nombre OR
        OLD.apellido IS DISTINCT FROM NEW.apellido OR
        OLD.edad IS DISTINCT FROM NEW.edad OR
        OLD.sexo IS DISTINCT FROM NEW.sexo OR
        OLD.departamento IS DISTINCT FROM NEW.departamento OR
        OLD.localidad IS DISTINCT FROM NEW.localidad OR
        (OLD.fecha_nacimiento IS DISTINCT FROM NEW.fecha_nacimiento)
    ) THEN
        UPDATE public.clientes
        SET
            nombre = NEW.nombre,
            apellido = NEW.apellido,
            edad = NEW.edad,
            sexo = NEW.sexo,
            departamento = NEW.departamento,
            localidad = NEW.localidad,
            fecha_nacimiento = NEW.fecha_nacimiento
        WHERE id = NEW.uuid_cliente;

        RAISE NOTICE 'Datos del cliente % actualizados', NEW.uuid_cliente;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza datos del cliente al actualizar invitado, incluyendo fecha_nacimiento.';

-- ========================================
-- STEP 4: Vista de clientes que cumplen años hoy
-- ========================================

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
    c.created_at,
    c.updated_at
FROM public.clientes c
WHERE c.fecha_nacimiento IS NOT NULL
  AND EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE);

COMMENT ON VIEW public.v_clientes_cumpleanios_hoy IS 'Clientes que cumplen años el día de hoy (para notificaciones/recordatorios).';

-- ========================================
-- STEP 5: Función RPC para obtener clientes que cumplen años hoy
-- ========================================

CREATE OR REPLACE FUNCTION public.get_clientes_cumpleanios_hoy()
RETURNS SETOF public.clientes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT c.*
    FROM public.clientes c
    WHERE c.fecha_nacimiento IS NOT NULL
      AND EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE);
$$;

COMMENT ON FUNCTION public.get_clientes_cumpleanios_hoy IS 'Devuelve los clientes que cumplen años hoy. Útil para notificaciones.';

GRANT EXECUTE ON FUNCTION public.get_clientes_cumpleanios_hoy() TO authenticated;

-- Para que el frontend reciba fecha_nacimiento al buscar por DNI, puedes actualizar
-- la función check_cliente_denegado en tu proyecto para incluir fecha_nacimiento
-- en el RETURNS TABLE y en el SELECT. Esta migración no la modifica para evitar
-- conflictos con esquemas que tengan columnas distintas en clientes.
