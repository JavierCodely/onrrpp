-- =============================================
-- Migration: 030 - Recreate Trigger Functions (CRITICAL)
-- Description: Drop and recreate all trigger functions with SECURITY DEFINER
--              This is CRITICAL to fix RLS issues with trigger functions
-- Dependencies: 008_create_triggers.sql
-- Version: 2.0 FINAL (Consolidated from 024_recreate_trigger_functions.sql)
-- Changes from original:
--   - ALL trigger functions now have SECURITY DEFINER
--   - This allows triggers to bypass RLS policies
--   - Fixes counter update issues when RLS blocks trigger execution
-- =============================================

-- ========================================
-- STEP 1: Drop existing triggers
-- ========================================

DROP TRIGGER IF EXISTS increment_total_invitados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS decrement_total_invitados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS update_total_ingresados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS handle_delete_ingresado_trigger ON public.invitados;

-- ========================================
-- STEP 2: Drop existing functions
-- ========================================

DROP FUNCTION IF EXISTS public.increment_total_invitados();
DROP FUNCTION IF EXISTS public.decrement_total_invitados();
DROP FUNCTION IF EXISTS public.update_total_ingresados();
DROP FUNCTION IF EXISTS public.handle_delete_ingresado();

-- ========================================
-- STEP 3: RECREATE FUNCTIONS WITH SECURITY DEFINER
-- ========================================

-- Function: Increment total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.increment_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: Allows function to bypass RLS
AS $$
BEGIN
    RAISE NOTICE 'Incrementando total_invitados para evento %', NEW.uuid_evento;

    UPDATE public.eventos
    SET total_invitados = total_invitados + 1
    WHERE id = NEW.uuid_evento;

    RAISE NOTICE 'Total_invitados incrementado';
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_total_invitados IS 'Incrementa el contador de invitados cuando se crea un nuevo invitado (SECURITY DEFINER)';

-- Function: Decrement total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.decrement_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: Allows function to bypass RLS
AS $$
BEGIN
    RAISE NOTICE 'Decrementando total_invitados para evento %', OLD.uuid_evento;

    UPDATE public.eventos
    SET total_invitados = GREATEST(total_invitados - 1, 0)
    WHERE id = OLD.uuid_evento;

    RAISE NOTICE 'Total_invitados decrementado';
    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.decrement_total_invitados IS 'Decrementa el contador de invitados cuando se elimina un invitado (SECURITY DEFINER)';

-- Function: Update total_ingresados counter on evento
CREATE OR REPLACE FUNCTION public.update_total_ingresados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: Allows function to bypass RLS
AS $$
BEGIN
    RAISE NOTICE 'Actualizando total_ingresados. OLD.ingresado=%, NEW.ingresado=%', OLD.ingresado, NEW.ingresado;

    -- Si cambió de false a true (ingresó)
    IF NEW.ingresado = true AND OLD.ingresado = false THEN
        UPDATE public.eventos
        SET total_ingresados = total_ingresados + 1
        WHERE id = NEW.uuid_evento;
        RAISE NOTICE 'Total_ingresados incrementado';

    -- Si cambió de true a false (salió o se marcó como no ingresado)
    ELSIF NEW.ingresado = false AND OLD.ingresado = true THEN
        UPDATE public.eventos
        SET total_ingresados = GREATEST(total_ingresados - 1, 0)
        WHERE id = NEW.uuid_evento;
        RAISE NOTICE 'Total_ingresados decrementado';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_total_ingresados IS 'Actualiza el contador de ingresados cuando cambia el estado de ingresado (SECURITY DEFINER)';

-- Function: Handle total_ingresados on invitado deletion
CREATE OR REPLACE FUNCTION public.handle_delete_ingresado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: Allows function to bypass RLS
AS $$
BEGIN
    RAISE NOTICE 'Eliminando invitado. ingresado=%', OLD.ingresado;

    -- Si el invitado eliminado estaba ingresado, decrementar el contador
    IF OLD.ingresado = true THEN
        UPDATE public.eventos
        SET total_ingresados = GREATEST(total_ingresados - 1, 0)
        WHERE id = OLD.uuid_evento;
        RAISE NOTICE 'Total_ingresados decrementado por eliminación';
    END IF;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.handle_delete_ingresado IS 'Decrementa el contador de ingresados si se elimina un invitado que había ingresado (SECURITY DEFINER)';

-- ========================================
-- STEP 4: RECREATE TRIGGERS
-- ========================================

-- Trigger: Increment total_invitados when invitado is created
CREATE TRIGGER increment_total_invitados_trigger
    AFTER INSERT ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_total_invitados();

-- Trigger: Decrement total_invitados when invitado is deleted
CREATE TRIGGER decrement_total_invitados_trigger
    AFTER DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_total_invitados();

-- Trigger: Update total_ingresados when ingresado status changes
CREATE TRIGGER update_total_ingresados_trigger
    AFTER UPDATE ON public.invitados
    FOR EACH ROW
    WHEN (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
    EXECUTE FUNCTION public.update_total_ingresados();

-- Trigger: Handle total_ingresados when invitado is deleted
CREATE TRIGGER handle_delete_ingresado_trigger
    AFTER DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_delete_ingresado();

-- ========================================
-- STEP 5: Verification
-- ========================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'invitados'
    AND trigger_name IN (
        'increment_total_invitados_trigger',
        'decrement_total_invitados_trigger',
        'update_total_ingresados_trigger',
        'handle_delete_ingresado_trigger'
    );

    IF trigger_count = 4 THEN
        RAISE NOTICE 'Todos los triggers de contadores fueron recreados correctamente ✅';
    ELSE
        RAISE WARNING 'Solo % de 4 triggers fueron recreados', trigger_count;
    END IF;
END $$;

-- ========================================
-- IMPORTANT NOTE
-- ========================================
-- SECURITY DEFINER is CRITICAL for these trigger functions.
-- Without it, RLS policies may block the UPDATE on eventos table,
-- causing counters to not update properly.
--
-- With SECURITY DEFINER, the function executes with the privileges
-- of the function owner (usually postgres), bypassing RLS.
