-- =============================================
-- Migration: 012 - Create Lotes Table
-- Description: Event batches with pricing, VIP categories, and commission tracking
-- Dependencies: 001_create_enums.sql, 004_create_eventos.sql, 005_create_invitados.sql
-- Version: 2.0 CONSOLIDATED
-- Consolidates: update/002_create_lotes.sql + update/005_fix_lote_triggers_v2.sql
-- Changes from original:
--   - Uses BEFORE validation + AFTER increment pattern (from update/005)
--   - Implements FOR UPDATE lock to prevent race conditions
--   - Improved error messages with lote name and availability
-- =============================================

-- ========================================
-- STEP 1: Create lotes table
-- ========================================

CREATE TABLE public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cantidad_maxima INTEGER NOT NULL,
    cantidad_actual INTEGER NOT NULL DEFAULT 0,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    es_vip BOOLEAN NOT NULL DEFAULT false,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT cantidad_maxima_valida CHECK (cantidad_maxima > 0),
    CONSTRAINT cantidad_actual_valida CHECK (cantidad_actual >= 0),
    CONSTRAINT cantidad_no_excede_maximo CHECK (cantidad_actual <= cantidad_maxima),
    CONSTRAINT precio_valido CHECK (precio >= 0)
);

-- ========================================
-- STEP 2: Add uuid_lote to invitados table
-- ========================================

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS uuid_lote UUID REFERENCES public.lotes(id) ON DELETE SET NULL;

-- ========================================
-- STEP 3: Create indexes
-- ========================================

CREATE INDEX idx_lotes_uuid_evento ON public.lotes(uuid_evento);
CREATE INDEX idx_lotes_activo ON public.lotes(activo);
CREATE INDEX idx_lotes_es_vip ON public.lotes(es_vip);
CREATE INDEX idx_invitados_uuid_lote ON public.invitados(uuid_lote);

-- ========================================
-- STEP 4: Add comments
-- ========================================

COMMENT ON TABLE public.lotes IS 'Lotes de invitados por evento con precios y categorías';
COMMENT ON COLUMN public.lotes.nombre IS 'Nombre del lote (ej: Early Bird, VIP Gold)';
COMMENT ON COLUMN public.lotes.cantidad_maxima IS 'Cantidad máxima de invitados en este lote';
COMMENT ON COLUMN public.lotes.cantidad_actual IS 'Cantidad actual de invitados en este lote';
COMMENT ON COLUMN public.lotes.precio IS 'Precio del lote (puede ser 0 para free)';
COMMENT ON COLUMN public.lotes.es_vip IS 'Si es categoría VIP (permite múltiples escaneos)';
COMMENT ON COLUMN public.invitados.uuid_lote IS 'Lote al que pertenece el invitado';

-- ========================================
-- STEP 5: FUNCIÓN - Validar disponibilidad del lote (BEFORE INSERT)
-- Esta se ejecuta ANTES del insert para validar
-- VERSIÓN MEJORADA con FOR UPDATE lock (from update/005)
-- ========================================

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

COMMENT ON FUNCTION validar_lote_disponibilidad() IS 'Valida que haya espacio disponible ANTES de permitir insert. Usa FOR UPDATE lock para prevenir race conditions.';

-- ========================================
-- STEP 6: FUNCIÓN - Incrementar contador después del insert (AFTER INSERT)
-- Esta se ejecuta DESPUÉS para actualizar el contador
-- ========================================

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

COMMENT ON FUNCTION incrementar_contador_lote() IS 'Incrementa contador DESPUÉS de insert exitoso';

-- ========================================
-- STEP 7: FUNCIÓN - Decrementar contador después del delete (AFTER DELETE)
-- ========================================

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

COMMENT ON FUNCTION decrementar_contador_lote() IS 'Decrementa contador DESPUÉS de delete';

-- ========================================
-- STEP 8: FUNCIÓN - Manejar cambio de lote en update (BEFORE UPDATE)
-- ========================================

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

COMMENT ON FUNCTION manejar_cambio_lote() IS 'Maneja cambio de lote en UPDATE, validando disponibilidad con FOR UPDATE lock';

-- ========================================
-- STEP 9: CREAR TRIGGERS EN EL ORDEN CORRECTO
-- ========================================

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

-- ========================================
-- STEP 10: Trigger para updated_at en lotes
-- ========================================

CREATE TRIGGER update_lotes_updated_at
    BEFORE UPDATE ON public.lotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- STEP 11: Enable RLS on lotes
-- ========================================

ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 12: RLS POLICIES for lotes
-- ========================================

-- RLS Policy: Users can see lotes of their club's events
CREATE POLICY "Users can view lotes of their club"
ON public.lotes
FOR SELECT
USING (
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can create lotes
CREATE POLICY "Admins can create lotes"
ON public.lotes
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can update lotes
CREATE POLICY "Admins can update lotes"
ON public.lotes
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can delete lotes
CREATE POLICY "Admins can delete lotes"
ON public.lotes
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- ========================================
-- STEP 13: SCRIPT DE CORRECCIÓN - Sincronizar contadores
-- ========================================

-- Actualizar todos los contadores para que coincidan con la realidad
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);

-- ========================================
-- STEP 14: Verificación final
-- ========================================

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
