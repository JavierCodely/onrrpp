-- =============================================
-- Update Migration: 006 - Simple Lote Counter Fix
-- Description: Simplified version that just works
-- =============================================

-- Drop ALL existing triggers
DROP TRIGGER IF EXISTS trigger_validar_lote_disponibilidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_incrementar_contador_lote ON public.invitados;
DROP TRIGGER IF EXISTS trigger_decrementar_contador_lote ON public.invitados;
DROP TRIGGER IF EXISTS trigger_manejar_cambio_lote ON public.invitados;
DROP TRIGGER IF EXISTS trigger_increment_lote_cantidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_decrement_lote_cantidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_update_lote_cantidad ON public.invitados;

-- Drop old functions
DROP FUNCTION IF EXISTS validar_lote_disponibilidad();
DROP FUNCTION IF EXISTS incrementar_contador_lote();
DROP FUNCTION IF EXISTS decrementar_contador_lote();
DROP FUNCTION IF EXISTS manejar_cambio_lote();
DROP FUNCTION IF EXISTS increment_lote_cantidad();
DROP FUNCTION IF EXISTS decrement_lote_cantidad();
DROP FUNCTION IF EXISTS update_lote_cantidad();

-- =============================================
-- FUNCIÓN: Incrementar al crear invitado
-- =============================================
CREATE OR REPLACE FUNCTION incrementar_lote_al_crear()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_actual INTEGER;
    v_cantidad_maxima INTEGER;
    v_nombre_lote TEXT;
BEGIN
    -- Si no hay lote asignado, permitir
    IF NEW.uuid_lote IS NULL THEN
        RETURN NEW;
    END IF;

    -- Obtener datos del lote
    SELECT cantidad_actual, cantidad_maxima, nombre
    INTO v_cantidad_actual, v_cantidad_maxima, v_nombre_lote
    FROM public.lotes
    WHERE id = NEW.uuid_lote AND activo = true;

    -- Si no se encuentra el lote, permitir (la FK lo manejará)
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Verificar si hay espacio disponible
    IF v_cantidad_actual >= v_cantidad_maxima THEN
        RAISE EXCEPTION 'El lote "%" está completo (% de %)',
            v_nombre_lote, v_cantidad_maxima, v_cantidad_maxima;
    END IF;

    -- Incrementar el contador
    UPDATE public.lotes
    SET cantidad_actual = cantidad_actual + 1
    WHERE id = NEW.uuid_lote;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: Decrementar al eliminar invitado
-- =============================================
CREATE OR REPLACE FUNCTION decrementar_lote_al_eliminar()
RETURNS TRIGGER AS $$
BEGIN
    -- Si había lote asignado, decrementar
    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = GREATEST(0, cantidad_actual - 1)
        WHERE id = OLD.uuid_lote;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: Manejar actualización de lote
-- =============================================
CREATE OR REPLACE FUNCTION actualizar_lote_al_cambiar()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_actual INTEGER;
    v_cantidad_maxima INTEGER;
    v_nombre_lote TEXT;
BEGIN
    -- Si el lote no cambió, no hacer nada
    IF OLD.uuid_lote IS NOT DISTINCT FROM NEW.uuid_lote THEN
        RETURN NEW;
    END IF;

    -- Decrementar lote anterior
    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = GREATEST(0, cantidad_actual - 1)
        WHERE id = OLD.uuid_lote;
    END IF;

    -- Si hay nuevo lote, verificar e incrementar
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Obtener datos del nuevo lote
        SELECT cantidad_actual, cantidad_maxima, nombre
        INTO v_cantidad_actual, v_cantidad_maxima, v_nombre_lote
        FROM public.lotes
        WHERE id = NEW.uuid_lote AND activo = true;

        -- Si no se encuentra, permitir que la FK maneje el error
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Verificar disponibilidad
        IF v_cantidad_actual >= v_cantidad_maxima THEN
            RAISE EXCEPTION 'El lote "%" está completo (% de %)',
                v_nombre_lote, v_cantidad_maxima, v_cantidad_maxima;
        END IF;

        -- Incrementar nuevo lote
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREAR TRIGGERS
-- =============================================

CREATE TRIGGER trigger_incrementar_lote_al_crear
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION incrementar_lote_al_crear();

CREATE TRIGGER trigger_decrementar_lote_al_eliminar
AFTER DELETE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION decrementar_lote_al_eliminar();

CREATE TRIGGER trigger_actualizar_lote_al_cambiar
BEFORE UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION actualizar_lote_al_cambiar();

-- =============================================
-- CORRECCIÓN: Sincronizar contadores existentes
-- =============================================

-- Actualizar todos los contadores
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COALESCE(COUNT(*), 0)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);

-- =============================================
-- Verificación
-- =============================================

DO $$
DECLARE
    v_total_lotes INTEGER;
    v_lotes_ok INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_lotes FROM public.lotes;

    SELECT COUNT(*) INTO v_lotes_ok
    FROM public.lotes l
    WHERE l.cantidad_actual = (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_lote = l.id
    );

    RAISE NOTICE '✅ Sincronización completa: %/% lotes correctos', v_lotes_ok, v_total_lotes;
END $$;

-- Comentarios
COMMENT ON FUNCTION incrementar_lote_al_crear() IS 'Valida disponibilidad e incrementa contador al crear invitado';
COMMENT ON FUNCTION decrementar_lote_al_eliminar() IS 'Decrementa contador al eliminar invitado';
COMMENT ON FUNCTION actualizar_lote_al_cambiar() IS 'Maneja cambio de lote al actualizar invitado';
