-- =============================================
-- Migration: 034 - Add Lote Activo Policy and Validation
-- Description: Add validation to prevent creating invitados with inactive lotes
-- Dependencies: 012_create_lotes.sql, 011_add_qr_to_invitados.sql
-- Version: 1.0 (Consolidated from 032_add_lote_activo_policy_and_validation.sql)
-- =============================================

-- ========================================
-- STEP 1: Update lote validation function to check if lote is active
-- ========================================

-- Drop existing function
DROP FUNCTION IF EXISTS validar_lote_disponibilidad() CASCADE;

-- Recreate with activo check
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
            RAISE EXCEPTION 'El lote "%" está inactivo y no se pueden agregar invitados', lote_record.nombre;
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

COMMENT ON FUNCTION validar_lote_disponibilidad() IS 'Valida que el lote esté activo y tenga espacio disponible ANTES de permitir insert. Usa FOR UPDATE lock.';

-- Recreate trigger (it was dropped with CASCADE)
DROP TRIGGER IF EXISTS trigger_validar_lote_disponibilidad ON public.invitados;
CREATE TRIGGER trigger_validar_lote_disponibilidad
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION validar_lote_disponibilidad();

-- ========================================
-- STEP 2: Update lote change validation function
-- ========================================

DROP FUNCTION IF EXISTS manejar_cambio_lote() CASCADE;

CREATE OR REPLACE FUNCTION manejar_cambio_lote()
RETURNS TRIGGER AS $$
DECLARE
    lote_record RECORD;
BEGIN
    -- Solo actuar si el lote cambió
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN

        -- Si hay un nuevo lote, validar disponibilidad y estado activo
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
                RAISE EXCEPTION 'El lote "%" está inactivo y no se pueden mover invitados a él', lote_record.nombre;
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

COMMENT ON FUNCTION manejar_cambio_lote() IS 'Maneja cambio de lote en UPDATE, validando que el nuevo lote esté activo y tenga disponibilidad';

-- Recreate trigger (it was dropped with CASCADE)
DROP TRIGGER IF EXISTS trigger_manejar_cambio_lote ON public.invitados;
CREATE TRIGGER trigger_manejar_cambio_lote
BEFORE UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION manejar_cambio_lote();

-- ========================================
-- NOTES
-- ========================================

-- Con esta migración:
-- 1. No se pueden crear invitados en lotes inactivos
-- 2. No se pueden mover invitados a lotes inactivos
-- 3. Los lotes inactivos mantienen sus invitados actuales
-- 4. Los admins pueden desactivar lotes sin afectar invitados existentes

-- Para desactivar un lote:
-- UPDATE public.lotes SET activo = false WHERE id = 'uuid-del-lote';

-- Para reactivar un lote:
-- UPDATE public.lotes SET activo = true WHERE id = 'uuid-del-lote';
