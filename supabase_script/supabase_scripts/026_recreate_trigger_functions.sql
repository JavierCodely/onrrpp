-- =============================================
-- Migration: 024 - Recreate Trigger Functions
-- Description: Drop and recreate all trigger functions to ensure they work
-- =============================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS increment_total_invitados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS decrement_total_invitados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS update_total_ingresados_trigger ON public.invitados;
DROP TRIGGER IF EXISTS handle_delete_ingresado_trigger ON public.invitados;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.increment_total_invitados();
DROP FUNCTION IF EXISTS public.decrement_total_invitados();
DROP FUNCTION IF EXISTS public.update_total_ingresados();
DROP FUNCTION IF EXISTS public.handle_delete_ingresado();

-- ========================================
-- RECREATE FUNCTIONS
-- ========================================

-- Function: Increment total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.increment_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function: Decrement total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.decrement_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function: Update total_ingresados counter on evento
CREATE OR REPLACE FUNCTION public.update_total_ingresados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function: Handle total_ingresados on invitado deletion
CREATE OR REPLACE FUNCTION public.handle_delete_ingresado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ========================================
-- RECREATE TRIGGERS
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

-- Add comments
COMMENT ON FUNCTION public.increment_total_invitados IS 'Incrementa el contador de invitados cuando se crea un nuevo invitado';
COMMENT ON FUNCTION public.decrement_total_invitados IS 'Decrementa el contador de invitados cuando se elimina un invitado';
COMMENT ON FUNCTION public.update_total_ingresados IS 'Actualiza el contador de ingresados cuando cambia el estado de ingresado';
COMMENT ON FUNCTION public.handle_delete_ingresado IS 'Decrementa el contador de ingresados si se elimina un invitado que había ingresado';
