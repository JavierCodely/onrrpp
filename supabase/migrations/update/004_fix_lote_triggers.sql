-- =============================================
-- Update Migration: 004 - Fix Lote Quantity Triggers
-- Description: Fix triggers to check capacity BEFORE incrementing
-- =============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_increment_lote_cantidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_update_lote_cantidad ON public.invitados;

-- Recreate increment function with correct logic
CREATE OR REPLACE FUNCTION increment_lote_cantidad()
RETURNS TRIGGER AS $$
DECLARE
    lote_record RECORD;
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Get current lote data
        SELECT cantidad_actual, cantidad_maxima
        INTO lote_record
        FROM public.lotes
        WHERE id = NEW.uuid_lote;

        -- Check if lote exists
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El lote seleccionado no existe';
        END IF;

        -- Check if lote is full BEFORE incrementing
        IF lote_record.cantidad_actual >= lote_record.cantidad_maxima THEN
            RAISE EXCEPTION 'El lote "%" está completo. Disponibles: 0/%',
                (SELECT nombre FROM public.lotes WHERE id = NEW.uuid_lote),
                lote_record.cantidad_maxima;
        END IF;

        -- Increment cantidad_actual
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_increment_lote_cantidad
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION increment_lote_cantidad();

-- Recreate update function with correct logic
CREATE OR REPLACE FUNCTION update_lote_cantidad()
RETURNS TRIGGER AS $$
DECLARE
    new_lote_record RECORD;
BEGIN
    -- If lote changed
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN
        -- Decrement old lote
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual - 1
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Increment new lote (if not null)
        IF NEW.uuid_lote IS NOT NULL THEN
            -- Get current lote data
            SELECT cantidad_actual, cantidad_maxima
            INTO new_lote_record
            FROM public.lotes
            WHERE id = NEW.uuid_lote;

            -- Check if lote exists
            IF NOT FOUND THEN
                RAISE EXCEPTION 'El lote seleccionado no existe';
            END IF;

            -- Check if new lote is full BEFORE incrementing
            IF new_lote_record.cantidad_actual >= new_lote_record.cantidad_maxima THEN
                RAISE EXCEPTION 'El lote "%" está completo. Disponibles: 0/%',
                    (SELECT nombre FROM public.lotes WHERE id = NEW.uuid_lote),
                    new_lote_record.cantidad_maxima;
            END IF;

            -- Increment new lote
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_lote_cantidad
BEFORE UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION update_lote_cantidad();

-- Add comment
COMMENT ON FUNCTION increment_lote_cantidad() IS 'Verifica disponibilidad ANTES de incrementar cantidad_actual del lote';
COMMENT ON FUNCTION update_lote_cantidad() IS 'Verifica disponibilidad ANTES de incrementar cantidad_actual al cambiar de lote';
