-- =============================================
-- Update Migration: 005 - Fix Lote Triggers V2
-- Description: Proper fix using AFTER triggers and correct transaction handling
-- =============================================

-- Drop ALL existing lote triggers
DROP TRIGGER IF EXISTS trigger_increment_lote_cantidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_decrement_lote_cantidad ON public.invitados;
DROP TRIGGER IF EXISTS trigger_update_lote_cantidad ON public.invitados;

-- Drop old functions
DROP FUNCTION IF EXISTS increment_lote_cantidad();
DROP FUNCTION IF EXISTS decrement_lote_cantidad();
DROP FUNCTION IF EXISTS update_lote_cantidad();

-- =============================================
-- NUEVA FUNCIÓN: Validar disponibilidad del lote
-- Esta se ejecuta ANTES del insert para validar
-- =============================================
CREATE OR REPLACE FUNCTION validar_lote_disponibilidad()
RETURNS TRIGGER AS $$
DECLARE
    lote_record RECORD;
BEGIN
    -- Solo validar si hay un lote asignado
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Obtener información del lote CON LOCK para prevenir race conditions
        SELECT
            nombre,
            cantidad_actual,
            cantidad_maxima,
            activo
        INTO lote_record
        FROM public.lotes
        WHERE id = NEW.uuid_lote
        FOR UPDATE;  -- LOCK para transacción segura

        -- Verificar que el lote existe
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El lote seleccionado no existe';
        END IF;

        -- Verificar que el lote está activo
        IF NOT lote_record.activo THEN
            RAISE EXCEPTION 'El lote "%" está inactivo', lote_record.nombre;
        END IF;

        -- Verificar disponibilidad ANTES de permitir el insert
        IF lote_record.cantidad_actual >= lote_record.cantidad_maxima THEN
            RAISE EXCEPTION 'El lote "%" está completo. Disponibles: 0/%',
                lote_record.nombre,
                lote_record.cantidad_maxima;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- NUEVA FUNCIÓN: Incrementar contador después del insert
-- Esta se ejecuta DESPUÉS para actualizar el contador
-- =============================================
CREATE OR REPLACE FUNCTION incrementar_contador_lote()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- NUEVA FUNCIÓN: Decrementar contador después del delete
-- =============================================
CREATE OR REPLACE FUNCTION decrementar_contador_lote()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual - 1
        WHERE id = OLD.uuid_lote;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- NUEVA FUNCIÓN: Manejar cambio de lote en update
-- =============================================
CREATE OR REPLACE FUNCTION manejar_cambio_lote()
RETURNS TRIGGER AS $$
DECLARE
    lote_record RECORD;
BEGIN
    -- Solo actuar si el lote cambió
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN

        -- Si hay un nuevo lote, validar disponibilidad
        IF NEW.uuid_lote IS NOT NULL THEN
            SELECT
                nombre,
                cantidad_actual,
                cantidad_maxima,
                activo
            INTO lote_record
            FROM public.lotes
            WHERE id = NEW.uuid_lote
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'El lote seleccionado no existe';
            END IF;

            IF NOT lote_record.activo THEN
                RAISE EXCEPTION 'El lote "%" está inactivo', lote_record.nombre;
            END IF;

            IF lote_record.cantidad_actual >= lote_record.cantidad_maxima THEN
                RAISE EXCEPTION 'El lote "%" está completo. Disponibles: 0/%',
                    lote_record.nombre,
                    lote_record.cantidad_maxima;
            END IF;
        END IF;

        -- Decrementar lote anterior (si existía)
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual - 1
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Incrementar nuevo lote (si existe)
        IF NEW.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREAR TRIGGERS EN EL ORDEN CORRECTO
-- =============================================

-- 1. BEFORE INSERT: Validar disponibilidad (bloquea si está lleno)
CREATE TRIGGER trigger_validar_lote_disponibilidad
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION validar_lote_disponibilidad();

-- 2. AFTER INSERT: Incrementar contador (después de insert exitoso)
CREATE TRIGGER trigger_incrementar_contador_lote
AFTER INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION incrementar_contador_lote();

-- 3. AFTER DELETE: Decrementar contador
CREATE TRIGGER trigger_decrementar_contador_lote
AFTER DELETE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION decrementar_contador_lote();

-- 4. BEFORE UPDATE: Validar y manejar cambio de lote
CREATE TRIGGER trigger_manejar_cambio_lote
BEFORE UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION manejar_cambio_lote();

-- =============================================
-- SCRIPT DE CORRECCIÓN: Sincronizar contadores
-- =============================================

-- Actualizar todos los contadores para que coincidan con la realidad
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);

-- =============================================
-- Agregar comentarios
-- =============================================
COMMENT ON FUNCTION validar_lote_disponibilidad() IS 'Valida que haya espacio disponible ANTES de permitir insert';
COMMENT ON FUNCTION incrementar_contador_lote() IS 'Incrementa contador DESPUÉS de insert exitoso';
COMMENT ON FUNCTION decrementar_contador_lote() IS 'Decrementa contador DESPUÉS de delete';
COMMENT ON FUNCTION manejar_cambio_lote() IS 'Maneja cambio de lote en UPDATE, validando disponibilidad';

-- =============================================
-- Verificación final
-- =============================================
DO $$
DECLARE
    discrepancias INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO discrepancias
    FROM public.lotes l
    WHERE l.cantidad_actual != (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_lote = l.id
    );

    IF discrepancias > 0 THEN
        RAISE WARNING 'Se encontraron % lotes con discrepancias. Fueron corregidos automáticamente.', discrepancias;
    ELSE
        RAISE NOTICE 'Todos los contadores están sincronizados correctamente. ✅';
    END IF;
END $$;
