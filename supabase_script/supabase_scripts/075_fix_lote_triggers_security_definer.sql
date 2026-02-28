-- =============================================
-- Migration: 075 - Fix lote quantity triggers with SECURITY DEFINER
-- Description: Las funciones de trigger que actualizan cantidad_actual en lotes
--              deben ejecutarse con SECURITY DEFINER para poder hacer UPDATE
--              en lotes aunque el usuario sea RRPP (que no tiene permiso de UPDATE
--              sobre la tabla lotes por RLS).
-- =============================================

-- =============================================
-- 1. Función: decrementar cuando se ELIMINA un invitado
-- =============================================
CREATE OR REPLACE FUNCTION public.decrement_lote_cantidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = GREATEST(cantidad_actual - 1, 0)
        WHERE id = OLD.uuid_lote;
    END IF;
    RETURN OLD;
END;
$$;

-- =============================================
-- 2. Función: incrementar cuando se CREA un invitado
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_lote_cantidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;

        -- Verificar que no supere el máximo
        IF (SELECT cantidad_actual > cantidad_maxima FROM public.lotes WHERE id = NEW.uuid_lote) THEN
            RAISE EXCEPTION 'El lote está completo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- =============================================
-- 3. Función: ajustar cuando se CAMBIA el lote de un invitado
-- =============================================
CREATE OR REPLACE FUNCTION public.update_lote_cantidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN
        -- Decrementar el lote anterior
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = GREATEST(cantidad_actual - 1, 0)
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Incrementar el nuevo lote
        IF NEW.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;

            -- Verificar que no supere el máximo
            IF (SELECT cantidad_actual > cantidad_maxima FROM public.lotes WHERE id = NEW.uuid_lote) THEN
                RAISE EXCEPTION 'El lote está completo';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- =============================================
-- Verificación: recalcular cantidad_actual para corregir
-- cualquier desincronización acumulada por este bug
-- =============================================
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*)::integer
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);
