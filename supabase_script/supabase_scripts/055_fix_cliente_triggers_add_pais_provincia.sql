-- =============================================
-- Migration: 055 - Fix Cliente Triggers to include pais and provincia
-- Description: Update triggers to sync pais/provincia between invitados and clientes
-- Issue: Triggers were not including pais/provincia, causing defaults (Argentina/Misiones) to be used
-- =============================================

-- ========================================
-- FUNCIÓN 1: Auto-crear o buscar cliente - ACTUALIZADA con pais/provincia
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
        -- Ahora incluye pais y provincia
        SELECT
            nombre,
            apellido,
            edad,
            sexo,
            pais,
            provincia,
            departamento,
            localidad,
            fecha_nacimiento
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.pais,
            NEW.provincia,
            NEW.departamento,
            NEW.localidad,
            NEW.fecha_nacimiento
        FROM public.clientes
        WHERE id = v_cliente_id;

        RAISE NOTICE '✅ Cliente existente encontrado (DNI: %). Datos autocompletados incluyendo pais/provincia.', NEW.dni;

    ELSE
        -- Si el cliente NO existe, crearlo con TODOS los campos incluyendo pais/provincia
        INSERT INTO public.clientes (
            dni,
            nombre,
            apellido,
            edad,
            fecha_nacimiento,
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
            NEW.fecha_nacimiento,
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

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca un cliente GLOBALMENTE por DNI. Incluye pais y provincia en la sincronización.';

-- ========================================
-- FUNCIÓN 5: Sincronizar datos - ACTUALIZADA con pais/provincia
-- ========================================

CREATE OR REPLACE FUNCTION sync_cliente_data_on_invitado_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo actualizar si cambió algún dato personal (ahora incluye pais/provincia)
    IF NEW.uuid_cliente IS NOT NULL AND (
        OLD.nombre IS DISTINCT FROM NEW.nombre OR
        OLD.apellido IS DISTINCT FROM NEW.apellido OR
        OLD.edad IS DISTINCT FROM NEW.edad OR
        OLD.sexo IS DISTINCT FROM NEW.sexo OR
        OLD.pais IS DISTINCT FROM NEW.pais OR
        OLD.provincia IS DISTINCT FROM NEW.provincia OR
        OLD.departamento IS DISTINCT FROM NEW.departamento OR
        OLD.localidad IS DISTINCT FROM NEW.localidad OR
        OLD.fecha_nacimiento IS DISTINCT FROM NEW.fecha_nacimiento
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
            localidad = NEW.localidad,
            fecha_nacimiento = COALESCE(NEW.fecha_nacimiento, fecha_nacimiento)
        WHERE id = NEW.uuid_cliente;

        RAISE NOTICE '✏️  Datos del cliente % actualizados (pais: %, provincia: %)', NEW.uuid_cliente, NEW.pais, NEW.provincia;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza los datos del cliente cuando se actualiza un invitado. Incluye pais y provincia.';

-- ========================================
-- FIX: Actualizar clientes existentes con datos de invitados
-- Esto corrige los clientes que fueron creados sin pais/provincia
-- ========================================

-- Actualizar clientes con los datos de su invitado más reciente
UPDATE clientes c
SET
    pais = i.pais,
    provincia = i.provincia
FROM (
    SELECT DISTINCT ON (uuid_cliente)
        uuid_cliente,
        pais,
        provincia
    FROM invitados
    WHERE uuid_cliente IS NOT NULL
      AND pais IS NOT NULL
    ORDER BY uuid_cliente, created_at DESC
) i
WHERE c.id = i.uuid_cliente
  AND (c.pais != i.pais OR c.provincia != i.provincia OR c.pais IS NULL);

-- ========================================
-- VERIFICACIÓN
-- ========================================

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM clientes c
    JOIN invitados i ON c.id = i.uuid_cliente
    WHERE c.pais = i.pais AND c.provincia = i.provincia;

    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRACIÓN 055 COMPLETADA';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Cambios realizados:';
    RAISE NOTICE '   1. auto_create_or_find_cliente: ahora incluye pais/provincia';
    RAISE NOTICE '   2. sync_cliente_data_on_invitado_update: ahora incluye pais/provincia';
    RAISE NOTICE '   3. Clientes existentes actualizados con datos de invitados';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
END $$;
