-- =============================================
-- Migration: 056 - Fix triggers removing fecha_nacimiento reference
-- Description: The invitados table doesn't have fecha_nacimiento, remove it from triggers
-- Error: record "old" has no field "fecha_nacimiento"
-- =============================================

-- ========================================
-- FUNCIÓN 1: Auto-crear o buscar cliente - SIN fecha_nacimiento
-- ========================================

CREATE OR REPLACE FUNCTION auto_create_or_find_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id UUID;
BEGIN
    -- Buscar si ya existe un cliente con ese DNI (GLOBAL - sin filtro de club)
    SELECT id INTO v_cliente_id
    FROM public.clientes
    WHERE dni = NEW.dni;

    -- Si el cliente existe, asignarlo al invitado
    IF v_cliente_id IS NOT NULL THEN
        NEW.uuid_cliente := v_cliente_id;

        -- Auto-completar los datos del invitado desde el cliente existente
        -- NO incluye fecha_nacimiento porque invitados no tiene ese campo
        SELECT
            nombre,
            apellido,
            edad,
            sexo,
            pais,
            provincia,
            departamento,
            localidad
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.pais,
            NEW.provincia,
            NEW.departamento,
            NEW.localidad
        FROM public.clientes
        WHERE id = v_cliente_id;

        RAISE NOTICE '✅ Cliente existente encontrado (DNI: %). Datos autocompletados.', NEW.dni;

    ELSE
        -- Si el cliente NO existe, crearlo con los campos disponibles
        -- NO incluye fecha_nacimiento porque invitados no tiene ese campo
        INSERT INTO public.clientes (
            dni,
            nombre,
            apellido,
            edad,
            sexo,
            pais,
            provincia,
            departamento,
            localidad,
            id_rrpp_creador
        ) VALUES (
            NEW.dni,
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.pais,
            NEW.provincia,
            NEW.departamento,
            NEW.localidad,
            NEW.id_rrpp
        )
        RETURNING id INTO v_cliente_id;

        NEW.uuid_cliente := v_cliente_id;

        RAISE NOTICE '✅ Nuevo cliente creado (DNI: %) con pais: %, provincia: %', NEW.dni, NEW.pais, NEW.provincia;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca un cliente GLOBALMENTE por DNI. Sin fecha_nacimiento (no existe en invitados).';

-- ========================================
-- FUNCIÓN 2: Sincronizar datos - SIN fecha_nacimiento
-- ========================================

CREATE OR REPLACE FUNCTION sync_cliente_data_on_invitado_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo actualizar si cambió algún dato personal (SIN fecha_nacimiento)
    IF NEW.uuid_cliente IS NOT NULL AND (
        OLD.nombre IS DISTINCT FROM NEW.nombre OR
        OLD.apellido IS DISTINCT FROM NEW.apellido OR
        OLD.edad IS DISTINCT FROM NEW.edad OR
        OLD.sexo IS DISTINCT FROM NEW.sexo OR
        OLD.pais IS DISTINCT FROM NEW.pais OR
        OLD.provincia IS DISTINCT FROM NEW.provincia OR
        OLD.departamento IS DISTINCT FROM NEW.departamento OR
        OLD.localidad IS DISTINCT FROM NEW.localidad
    ) THEN
        UPDATE public.clientes
        SET
            nombre = NEW.nombre,
            apellido = NEW.apellido,
            edad = NEW.edad,
            sexo = NEW.sexo,
            pais = NEW.pais,
            provincia = NEW.provincia,
            departamento = NEW.departamento,
            localidad = NEW.localidad
        WHERE id = NEW.uuid_cliente;

        RAISE NOTICE '✏️  Datos del cliente % actualizados', NEW.uuid_cliente;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza los datos del cliente cuando se actualiza un invitado. Sin fecha_nacimiento.';

-- ========================================
-- VERIFICACIÓN
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRACIÓN 056 COMPLETADA';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Cambios realizados:';
    RAISE NOTICE '   1. auto_create_or_find_cliente: removido fecha_nacimiento';
    RAISE NOTICE '   2. sync_cliente_data_on_invitado_update: removido fecha_nacimiento';
    RAISE NOTICE '';
    RAISE NOTICE '✅ El error "record old has no field fecha_nacimiento" está corregido';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
END $$;
