-- =============================================
-- Migration: 041 - ROLLBACK - Eliminar fecha_nacimiento de invitados
-- Description: Quita la columna fecha_nacimiento de invitados, elimina vista/función
--              de cumpleaños y restaura los triggers sin fecha_nacimiento.
--              La edad se carga/solicita siempre en cada venta desde el frontend.
-- =============================================

-- ========================================
-- STEP 1: Eliminar vista y función de cumpleaños
-- ========================================

DROP VIEW IF EXISTS public.v_clientes_cumpleanios_hoy;

DROP FUNCTION IF EXISTS public.get_clientes_cumpleanios_hoy();

-- ========================================
-- STEP 2: Restaurar triggers SIN fecha_nacimiento (como en 056)
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
            c.localidad
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad
        FROM public.clientes c
        WHERE c.id = v_cliente_id;
    ELSE
        INSERT INTO public.clientes (
            dni,
            nombre,
            apellido,
            edad,
            sexo,
            departamento,
            localidad,
            id_rrpp_creador
        ) VALUES (
            NEW.dni,
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad,
            NEW.id_rrpp
        )
        RETURNING id INTO v_cliente_id;
        NEW.uuid_cliente := v_cliente_id;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca cliente por DNI. Sin fecha_nacimiento; la edad se gestiona en cada venta.';

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
        OLD.localidad IS DISTINCT FROM NEW.localidad
    ) THEN
        UPDATE public.clientes
        SET
            nombre = NEW.nombre,
            apellido = NEW.apellido,
            edad = NEW.edad,
            sexo = NEW.sexo,
            departamento = NEW.departamento,
            localidad = NEW.localidad
        WHERE id = NEW.uuid_cliente;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza datos del cliente al actualizar invitado. Sin fecha_nacimiento.';

-- ========================================
-- STEP 3: Quitar columna fecha_nacimiento de invitados
-- ========================================

ALTER TABLE public.invitados
DROP COLUMN IF EXISTS fecha_nacimiento;
