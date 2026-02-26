-- =============================================
-- Migration: 044 - Create Cliente Triggers and Validations (GLOBAL)
-- Description: Auto-create clientes globally, validate duplicates, and track ingresos by club
-- Dependencies: 042_create_clientes_table.sql, 043_update_invitados_with_clientes.sql
-- Version: 2.0 (GLOBAL)
-- =============================================

-- ========================================
-- FUNCIÓN 1: Auto-crear o buscar cliente GLOBALMENTE antes de insertar invitado
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
        -- Esto permite que RRPP de otros clubs vean los datos ya cargados
        SELECT
            nombre,
            apellido,
            edad,
            sexo,
            departamento,
            localidad,
            fecha_nacimiento
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad,
            NEW.fecha_nacimiento
        FROM public.clientes
        WHERE id = v_cliente_id;

        RAISE NOTICE '✅ Cliente existente encontrado (DNI: %). Datos autocompletados.', NEW.dni;

    ELSE
        -- Si el cliente NO existe, crearlo con el RRPP actual como creador
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
            NEW.id_rrpp  -- El RRPP que crea el invitado es el creador del cliente
        )
        RETURNING id INTO v_cliente_id;

        NEW.uuid_cliente := v_cliente_id;

        RAISE NOTICE '✅ Nuevo cliente creado (DNI: %) por RRPP: %', NEW.dni, NEW.id_rrpp;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca un cliente GLOBALMENTE por DNI. Si existe en otro club, autocompleta los datos. Asigna id_rrpp_creador al crear.';

-- ========================================
-- TRIGGER 1: Ejecutar auto_create_or_find_cliente BEFORE INSERT
-- ========================================

DROP TRIGGER IF EXISTS trigger_auto_create_or_find_cliente ON public.invitados;

CREATE TRIGGER trigger_auto_create_or_find_cliente
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION auto_create_or_find_cliente();

-- ========================================
-- FUNCIÓN 2: Validar que cliente no tenga duplicado en el mismo lote
-- ========================================

CREATE OR REPLACE FUNCTION validar_cliente_lote_unico()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cliente_nombre TEXT;
    v_lote_nombre TEXT;
BEGIN
    -- Solo validar si hay un lote asignado y un cliente asignado
    IF NEW.uuid_lote IS NOT NULL AND NEW.uuid_cliente IS NOT NULL THEN

        -- Verificar si ya existe un invitado con el mismo cliente y lote
        IF EXISTS (
            SELECT 1
            FROM public.invitados
            WHERE uuid_cliente = NEW.uuid_cliente
            AND uuid_lote = NEW.uuid_lote
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        ) THEN
            -- Obtener nombres para mensaje de error más descriptivo
            SELECT nombre || ' ' || apellido INTO v_cliente_nombre
            FROM public.clientes
            WHERE id = NEW.uuid_cliente;

            SELECT nombre INTO v_lote_nombre
            FROM public.lotes
            WHERE id = NEW.uuid_lote;

            RAISE EXCEPTION 'El cliente "%" ya tiene una entrada en el lote "%". No se permiten entradas duplicadas por lote.',
                v_cliente_nombre,
                v_lote_nombre;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validar_cliente_lote_unico IS 'Valida que un cliente no tenga múltiples entradas en el mismo lote';

-- ========================================
-- TRIGGER 2: Validar cliente único por lote BEFORE INSERT/UPDATE
-- ========================================

DROP TRIGGER IF EXISTS trigger_validar_cliente_lote_unico ON public.invitados;

CREATE TRIGGER trigger_validar_cliente_lote_unico
BEFORE INSERT OR UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION validar_cliente_lote_unico();

-- ========================================
-- FUNCIÓN 3: Incrementar contador de ingresos del cliente POR CLUB
-- ========================================

CREATE OR REPLACE FUNCTION incrementar_ingresos_cliente_por_club()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evento_club UUID;
BEGIN
    -- Obtener el club del evento
    SELECT uuid_club INTO v_evento_club
    FROM public.eventos
    WHERE id = NEW.uuid_evento;

    -- Si cambió de false a true (ingresó por primera vez en este evento)
    IF NEW.ingresado = true AND OLD.ingresado = false THEN

        -- Verificar si ya existe un registro de ingresos para este cliente + club
        IF EXISTS (
            SELECT 1
            FROM public.clientes_ingresos_por_club
            WHERE uuid_cliente = NEW.uuid_cliente
            AND uuid_club = v_evento_club
        ) THEN
            -- Si existe, incrementar
            UPDATE public.clientes_ingresos_por_club
            SET ingresos = ingresos + 1
            WHERE uuid_cliente = NEW.uuid_cliente
            AND uuid_club = v_evento_club;
        ELSE
            -- Si no existe, crear registro con 1 ingreso
            INSERT INTO public.clientes_ingresos_por_club (
                uuid_cliente,
                uuid_club,
                ingresos
            ) VALUES (
                NEW.uuid_cliente,
                v_evento_club,
                1
            );
        END IF;

        RAISE NOTICE '✅ Ingreso registrado para cliente % en club %', NEW.uuid_cliente, v_evento_club;

    -- Si cambió de true a false (se revirtió el ingreso)
    ELSIF NEW.ingresado = false AND OLD.ingresado = true THEN

        UPDATE public.clientes_ingresos_por_club
        SET ingresos = GREATEST(ingresos - 1, 0)
        WHERE uuid_cliente = NEW.uuid_cliente
        AND uuid_club = v_evento_club;

        RAISE NOTICE '⚠️  Ingreso revertido para cliente % en club %', NEW.uuid_cliente, v_evento_club;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION incrementar_ingresos_cliente_por_club IS 'Incrementa o decrementa el contador de ingresos del cliente POR CLUB cuando cambia el estado de ingresado';

-- ========================================
-- TRIGGER 3: Actualizar contador de ingresos por club AFTER UPDATE
-- ========================================

DROP TRIGGER IF EXISTS trigger_incrementar_ingresos_cliente_por_club ON public.invitados;

CREATE TRIGGER trigger_incrementar_ingresos_cliente_por_club
AFTER UPDATE ON public.invitados
FOR EACH ROW
WHEN (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
EXECUTE FUNCTION incrementar_ingresos_cliente_por_club();

-- ========================================
-- FUNCIÓN 4: Decrementar ingresos si se elimina un invitado que había ingresado
-- ========================================

CREATE OR REPLACE FUNCTION decrementar_ingresos_cliente_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evento_club UUID;
BEGIN
    -- Si el invitado eliminado estaba ingresado, decrementar el contador del cliente en ese club
    IF OLD.ingresado = true AND OLD.uuid_cliente IS NOT NULL THEN

        -- Obtener el club del evento
        SELECT uuid_club INTO v_evento_club
        FROM public.eventos
        WHERE id = OLD.uuid_evento;

        -- Decrementar contador del club
        UPDATE public.clientes_ingresos_por_club
        SET ingresos = GREATEST(ingresos - 1, 0)
        WHERE uuid_cliente = OLD.uuid_cliente
        AND uuid_club = v_evento_club;

        RAISE NOTICE '⚠️  Ingreso eliminado para cliente % en club %', OLD.uuid_cliente, v_evento_club;
    END IF;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION decrementar_ingresos_cliente_on_delete IS 'Decrementa el contador de ingresos del cliente por club si se elimina un invitado que había ingresado';

-- ========================================
-- TRIGGER 4: Decrementar ingresos AFTER DELETE
-- ========================================

DROP TRIGGER IF EXISTS trigger_decrementar_ingresos_cliente_on_delete ON public.invitados;

CREATE TRIGGER trigger_decrementar_ingresos_cliente_on_delete
AFTER DELETE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION decrementar_ingresos_cliente_on_delete();

-- ========================================
-- FUNCIÓN 5: Actualizar datos del cliente cuando se edita un invitado
-- Esta función permite que si un RRPP corrige datos, se actualice también el cliente
-- ========================================

CREATE OR REPLACE FUNCTION sync_cliente_data_on_invitado_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo actualizar si cambió algún dato personal
    IF NEW.uuid_cliente IS NOT NULL AND (
        OLD.nombre IS DISTINCT FROM NEW.nombre OR
        OLD.apellido IS DISTINCT FROM NEW.apellido OR
        OLD.edad IS DISTINCT FROM NEW.edad OR
        OLD.sexo IS DISTINCT FROM NEW.sexo OR
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
            departamento = NEW.departamento,
            localidad = NEW.localidad,
            fecha_nacimiento = COALESCE(NEW.fecha_nacimiento, fecha_nacimiento)
        WHERE id = NEW.uuid_cliente;

        RAISE NOTICE '✏️  Datos del cliente % actualizados', NEW.uuid_cliente;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza los datos del cliente cuando se actualiza un invitado (permite correcciones globales)';

-- ========================================
-- TRIGGER 5: Sincronizar datos AFTER UPDATE
-- ========================================

DROP TRIGGER IF EXISTS trigger_sync_cliente_data_on_invitado_update ON public.invitados;

CREATE TRIGGER trigger_sync_cliente_data_on_invitado_update
AFTER UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION sync_cliente_data_on_invitado_update();

-- ========================================
-- VERIFICACIÓN: Mostrar triggers creados
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '✅ TRIGGERS DE CLIENTES GLOBALES CREADOS';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Triggers activos:';
    RAISE NOTICE '   1. trigger_auto_create_or_find_cliente (BEFORE INSERT)';
    RAISE NOTICE '   2. trigger_validar_cliente_lote_unico (BEFORE INSERT/UPDATE)';
    RAISE NOTICE '   3. trigger_incrementar_ingresos_cliente_por_club (AFTER UPDATE)';
    RAISE NOTICE '   4. trigger_decrementar_ingresos_cliente_on_delete (AFTER DELETE)';
    RAISE NOTICE '   5. trigger_sync_cliente_data_on_invitado_update (AFTER UPDATE)';
    RAISE NOTICE '';
    RAISE NOTICE '🌍 Funcionalidades GLOBALES implementadas:';
    RAISE NOTICE '   ✓ Clientes compartidos entre TODOS los clubs';
    RAISE NOTICE '   ✓ Auto-completado cuando RRPP de otro club ingresa DNI existente';
    RAISE NOTICE '   ✓ Registro de RRPP creador original (id_rrpp_creador)';
    RAISE NOTICE '   ✓ Contador de ingresos separado POR CLUB';
    RAISE NOTICE '   ✓ Validación: un cliente solo puede tener una entrada por lote';
    RAISE NOTICE '   ✓ Sincronización automática de datos cliente-invitado';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
END $$;
