-- =============================================
-- Migration: 049 - Unique DNI per Evento
-- Description: Add constraint to prevent same DNI from being registered multiple times for the same event
-- Dependencies: 005_create_invitados.sql
-- =============================================

-- ========================================
-- STEP 1: Check for existing duplicates
-- ========================================

-- First, let's identify if there are any duplicate DNI per evento
DO $$
DECLARE
    v_duplicates_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_duplicates_count
    FROM (
        SELECT dni, uuid_evento, COUNT(*) as cnt
        FROM public.invitados
        GROUP BY dni, uuid_evento
        HAVING COUNT(*) > 1
    ) duplicates;

    IF v_duplicates_count > 0 THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE 'ADVERTENCIA: Se encontraron % combinaciones DNI/Evento duplicadas', v_duplicates_count;
        RAISE NOTICE 'Ejecute la siguiente consulta para ver los duplicados:';
        RAISE NOTICE 'SELECT dni, uuid_evento, COUNT(*) FROM invitados GROUP BY dni, uuid_evento HAVING COUNT(*) > 1;';
        RAISE NOTICE '================================================';
        RAISE EXCEPTION 'No se puede crear la constraint. Primero debe resolver los duplicados existentes.';
    ELSE
        RAISE NOTICE 'No se encontraron duplicados DNI/Evento. Procediendo con la migracion...';
    END IF;
END $$;

-- ========================================
-- STEP 2: Drop existing index if any (from previous unique constraint on dni alone)
-- ========================================

-- Note: There might be an existing unique index on just dni per evento
-- We need to check and handle this

-- ========================================
-- STEP 3: Create unique constraint on DNI + Evento
-- ========================================

-- Add unique constraint: same DNI cannot be registered twice for the same event
ALTER TABLE public.invitados
DROP CONSTRAINT IF EXISTS invitados_dni_evento_unique;

ALTER TABLE public.invitados
ADD CONSTRAINT invitados_dni_evento_unique UNIQUE (dni, uuid_evento);

COMMENT ON CONSTRAINT invitados_dni_evento_unique ON public.invitados IS
'Garantiza que un DNI solo pueda registrarse una vez por evento. Una persona no puede tener multiples entradas al mismo evento.';

-- ========================================
-- STEP 4: Create index for faster lookups (the UNIQUE constraint already creates one, but let's be explicit)
-- ========================================

-- The UNIQUE constraint automatically creates an index, so we don't need to create another one

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
    v_constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'invitados_dni_evento_unique'
        AND table_name = 'invitados'
        AND constraint_type = 'UNIQUE'
    ) INTO v_constraint_exists;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'MIGRACION 049 COMPLETADA';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios realizados:';
    RAISE NOTICE '  1. Constraint UNIQUE agregada: invitados_dni_evento_unique';
    RAISE NOTICE '     - Columnas: (dni, uuid_evento)';
    RAISE NOTICE '';
    RAISE NOTICE 'Funcionalidad:';
    RAISE NOTICE '  - Un DNI solo puede registrarse UNA vez por evento';
    RAISE NOTICE '  - No importa si es lote diferente, el mismo DNI no puede tener';
    RAISE NOTICE '    multiples registros en el mismo evento';
    RAISE NOTICE '';
    IF v_constraint_exists THEN
        RAISE NOTICE 'Estado: CONSTRAINT CREADA EXITOSAMENTE';
    ELSE
        RAISE NOTICE 'Estado: ERROR - La constraint no fue creada';
    END IF;
    RAISE NOTICE '================================================';
END $$;
