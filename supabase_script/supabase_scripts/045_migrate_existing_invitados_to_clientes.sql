-- =============================================
-- Migration: 045 - Migrate Existing Invitados to Clientes (GLOBAL - OPTIONAL)
-- Description: Migrate existing invitados data to global clientes table
-- Dependencies: 044_create_cliente_triggers_and_validations.sql
-- Version: 2.0 (GLOBAL)
-- IMPORTANTE: Este script es OPCIONAL y solo debe ejecutarse si tienes datos existentes
-- =============================================

-- ========================================
-- PASO 1: Migrar datos únicos a la tabla clientes GLOBAL
-- ========================================

DO $$
DECLARE
    invitados_count INTEGER;
    clientes_created INTEGER := 0;
BEGIN
    -- Contar invitados existentes
    SELECT COUNT(*) INTO invitados_count FROM public.invitados WHERE uuid_cliente IS NULL;

    IF invitados_count > 0 THEN
        RAISE NOTICE '📊 Encontrados % invitados sin cliente asignado', invitados_count;
        RAISE NOTICE '🔄 Iniciando migración GLOBAL...';

        -- Insertar clientes únicos desde invitados (agrupados SOLO por DNI)
        -- El primer RRPP que lo creó será el id_rrpp_creador
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
        )
        SELECT DISTINCT ON (i.dni)
            i.dni,
            i.nombre,
            i.apellido,
            i.edad,
            i.fecha_nacimiento,
            i.sexo,
            i.departamento,
            i.localidad,
            i.id_rrpp  -- El primer RRPP que creó a este DNI
        FROM public.invitados i
        WHERE i.uuid_cliente IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.dni = i.dni
        )
        ORDER BY i.dni, i.created_at ASC;  -- El más antiguo será el creador

        GET DIAGNOSTICS clientes_created = ROW_COUNT;

        RAISE NOTICE '✅ Creados % nuevos clientes únicos (GLOBALES)', clientes_created;
    ELSE
        RAISE NOTICE '✅ No hay invitados sin cliente asignado';
    END IF;
END $$;

-- ========================================
-- PASO 2: Asignar uuid_cliente a invitados existentes
-- ========================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '🔗 Vinculando invitados existentes con clientes...';

    UPDATE public.invitados i
    SET uuid_cliente = c.id
    FROM public.clientes c
    WHERE c.dni = i.dni
    AND i.uuid_cliente IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RAISE NOTICE '✅ Vinculados % invitados con sus clientes', updated_count;
END $$;

-- ========================================
-- PASO 3: Crear registros de ingresos por club
-- ========================================

DO $$
DECLARE
    registros_created INTEGER;
BEGIN
    RAISE NOTICE '🔢 Creando registros de ingresos por club...';

    -- Insertar un registro por cada combinación de cliente + club que tiene ingresos
    INSERT INTO public.clientes_ingresos_por_club (
        uuid_cliente,
        uuid_club,
        ingresos
    )
    SELECT
        i.uuid_cliente,
        e.uuid_club,
        COUNT(*) FILTER (WHERE i.ingresado = true) as total_ingresos
    FROM public.invitados i
    JOIN public.eventos e ON i.uuid_evento = e.id
    WHERE i.uuid_cliente IS NOT NULL
    GROUP BY i.uuid_cliente, e.uuid_club
    ON CONFLICT (uuid_cliente, uuid_club) DO UPDATE
    SET ingresos = EXCLUDED.ingresos;

    GET DIAGNOSTICS registros_created = ROW_COUNT;

    RAISE NOTICE '✅ Creados/actualizados % registros de ingresos por club', registros_created;
END $$;

-- ========================================
-- PASO 4: Verificación final
-- ========================================

DO $$
DECLARE
    invitados_sin_cliente INTEGER;
    clientes_total INTEGER;
    registros_ingresos INTEGER;
    ingresos_total INTEGER;
    clubs_con_clientes INTEGER;
BEGIN
    -- Contar invitados sin cliente
    SELECT COUNT(*) INTO invitados_sin_cliente
    FROM public.invitados
    WHERE uuid_cliente IS NULL;

    -- Contar clientes totales
    SELECT COUNT(*) INTO clientes_total
    FROM public.clientes;

    -- Contar registros de ingresos
    SELECT COUNT(*) INTO registros_ingresos
    FROM public.clientes_ingresos_por_club;

    -- Contar ingresos totales
    SELECT SUM(ingresos) INTO ingresos_total
    FROM public.clientes_ingresos_por_club;

    -- Contar cuántos clubs tienen clientes
    SELECT COUNT(DISTINCT uuid_club) INTO clubs_con_clientes
    FROM public.clientes_ingresos_por_club;

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN GLOBAL';
    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE 'Total de clientes (GLOBALES): %', clientes_total;
    RAISE NOTICE 'Clubs con registros de clientes: %', clubs_con_clientes;
    RAISE NOTICE 'Registros de ingresos por club: %', registros_ingresos;
    RAISE NOTICE 'Total de ingresos registrados: %', COALESCE(ingresos_total, 0);
    RAISE NOTICE 'Invitados sin cliente: %', invitados_sin_cliente;
    RAISE NOTICE '';

    IF invitados_sin_cliente > 0 THEN
        RAISE WARNING '⚠️  Hay % invitados sin cliente asignado. Revisa la migración.', invitados_sin_cliente;
    ELSE
        RAISE NOTICE '✅ Todos los invitados tienen un cliente asignado';
    END IF;

    RAISE NOTICE '══════════════════════════════════════════';
END $$;

-- ========================================
-- PASO 5: Verificar duplicados potenciales
-- ========================================

DO $$
DECLARE
    duplicados_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicados_count
    FROM (
        SELECT uuid_cliente, uuid_lote, COUNT(*) as cantidad
        FROM public.invitados
        WHERE uuid_cliente IS NOT NULL
        AND uuid_lote IS NOT NULL
        GROUP BY uuid_cliente, uuid_lote
        HAVING COUNT(*) > 1
    ) duplicados;

    IF duplicados_count > 0 THEN
        RAISE WARNING '⚠️  Se encontraron % casos de clientes con múltiples entradas en el mismo lote', duplicados_count;
        RAISE NOTICE 'Ejecuta esta query para ver los duplicados:';
        RAISE NOTICE '';
        RAISE NOTICE 'SELECT c.dni, c.nombre, c.apellido, l.nombre as lote, COUNT(*) as cantidad';
        RAISE NOTICE 'FROM public.invitados i';
        RAISE NOTICE 'JOIN public.clientes c ON i.uuid_cliente = c.id';
        RAISE NOTICE 'JOIN public.lotes l ON i.uuid_lote = l.id';
        RAISE NOTICE 'GROUP BY c.dni, c.nombre, c.apellido, l.nombre, i.uuid_cliente, i.uuid_lote';
        RAISE NOTICE 'HAVING COUNT(*) > 1;';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ No se encontraron duplicados (cliente + lote)';
    END IF;
END $$;

-- ========================================
-- PASO 6: Estadísticas de clientes compartidos entre clubs
-- ========================================

DO $$
DECLARE
    clientes_multi_club INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE '🌍 ESTADÍSTICAS DE CLIENTES COMPARTIDOS';
    RAISE NOTICE '══════════════════════════════════════════';

    -- Contar clientes que han asistido a más de un club
    SELECT COUNT(*) INTO clientes_multi_club
    FROM (
        SELECT uuid_cliente
        FROM public.clientes_ingresos_por_club
        GROUP BY uuid_cliente
        HAVING COUNT(DISTINCT uuid_club) > 1
    ) multi;

    RAISE NOTICE 'Clientes que asistieron a múltiples clubs: %', clientes_multi_club;
    RAISE NOTICE '';

    -- Mostrar top 5 clientes con más ingresos totales
    RAISE NOTICE '📊 Top 5 clientes con más ingresos (suma de todos los clubs):';
    FOR rec IN (
        SELECT
            c.dni,
            c.nombre,
            c.apellido,
            SUM(cic.ingresos) as total_ingresos,
            COUNT(DISTINCT cic.uuid_club) as clubs_visitados
        FROM public.clientes c
        JOIN public.clientes_ingresos_por_club cic ON c.id = cic.uuid_cliente
        GROUP BY c.id, c.dni, c.nombre, c.apellido
        ORDER BY total_ingresos DESC
        LIMIT 5
    ) LOOP
        RAISE NOTICE '   - % % (DNI: %): % ingresos en % clubs',
            rec.nombre, rec.apellido, rec.dni, rec.total_ingresos, rec.clubs_visitados;
    END LOOP;

    RAISE NOTICE '══════════════════════════════════════════';
END $$;
