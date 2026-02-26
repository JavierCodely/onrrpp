-- =============================================
-- Migration: 031 - Recalculate Counters (UTILITY)
-- Description: Manually recalculate all event counters from actual data
--              Use this if counters become out of sync
-- Dependencies: 004_create_eventos.sql, 005_create_invitados.sql
-- Version: 2.0 CONSOLIDATED
-- Consolidates: 019_recalculate_counters.sql + 023_force_recalculate_now.sql
-- WARNING: This is a utility script - only run if counters are incorrect
-- =============================================

-- ========================================
-- STEP 1: Recalculate total_invitados for all events
-- ========================================

DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando recálculo de total_invitados...';

    UPDATE public.eventos e
    SET total_invitados = (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
    );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RAISE NOTICE 'total_invitados recalculado para % eventos', affected_rows;
END $$;

-- ========================================
-- STEP 2: Recalculate total_ingresados for all events
-- ========================================

DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando recálculo de total_ingresados...';

    UPDATE public.eventos e
    SET total_ingresados = (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
        AND i.ingresado = true
    );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RAISE NOTICE 'total_ingresados recalculado para % eventos', affected_rows;
END $$;

-- ========================================
-- STEP 3: Verification - Check for discrepancies
-- ========================================

DO $$
DECLARE
    discrepancias_invitados INTEGER;
    discrepancias_ingresados INTEGER;
BEGIN
    RAISE NOTICE 'Verificando consistencia de contadores...';

    -- Check total_invitados discrepancies
    SELECT COUNT(*)
    INTO discrepancias_invitados
    FROM public.eventos e
    WHERE e.total_invitados != (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
    );

    -- Check total_ingresados discrepancies
    SELECT COUNT(*)
    INTO discrepancias_ingresados
    FROM public.eventos e
    WHERE e.total_ingresados != (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
        AND i.ingresado = true
    );

    IF discrepancias_invitados = 0 AND discrepancias_ingresados = 0 THEN
        RAISE NOTICE 'Todos los contadores están sincronizados correctamente ✅';
    ELSE
        RAISE WARNING 'Discrepancias encontradas: % eventos con total_invitados incorrecto, % eventos con total_ingresados incorrecto',
            discrepancias_invitados, discrepancias_ingresados;
    END IF;
END $$;

-- ========================================
-- STEP 4: Display summary
-- ========================================

SELECT
    e.id,
    e.nombre,
    e.total_invitados as contador_total_invitados,
    (SELECT COUNT(*) FROM public.invitados WHERE uuid_evento = e.id) as real_total_invitados,
    e.total_ingresados as contador_total_ingresados,
    (SELECT COUNT(*) FROM public.invitados WHERE uuid_evento = e.id AND ingresado = true) as real_total_ingresados,
    CASE
        WHEN e.total_invitados = (SELECT COUNT(*) FROM public.invitados WHERE uuid_evento = e.id)
         AND e.total_ingresados = (SELECT COUNT(*) FROM public.invitados WHERE uuid_evento = e.id AND ingresado = true)
        THEN '✅ OK'
        ELSE '❌ DISCREPANCIA'
    END as estado
FROM public.eventos e
ORDER BY e.created_at DESC;

-- ========================================
-- NOTES
-- ========================================
-- This script should only be run if:
-- 1. Counters appear incorrect in the UI
-- 2. After fixing trigger functions
-- 3. After data migration or bulk operations
--
-- Normal operation should NOT require running this script.
-- Triggers should keep counters in sync automatically.
