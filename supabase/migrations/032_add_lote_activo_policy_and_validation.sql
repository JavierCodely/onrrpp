-- =============================================
-- Migration: 032 - Add Lote Activo Policy and Validation
-- Description: Update RLS policies so RRPPs only see active lotes, and add validation trigger
-- Dependencies: update/002_create_lotes.sql, 030_add_grupos_to_personal_and_lotes.sql
-- =============================================

-- ========================================
-- STEP 1: Update RLS policy for RRPPs to only see active lotes
-- ========================================

-- Drop existing policy
DROP POLICY IF EXISTS "RRPPs can view lotes of their grupo or without grupo" ON public.lotes;

-- Recreate policy with activo filter for RRPPs
CREATE POLICY "RRPPs can view lotes of their grupo or without grupo"
ON public.lotes
FOR SELECT
USING (
    -- Evento pertenece al club del usuario
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    AND (
        -- Admin y Seguridad ven todos los lotes (activos e inactivos)
        public.get_current_user_role() IN ('admin', 'seguridad')
        OR
        -- RRPP ve solo lotes ACTIVOS de su grupo o lotes sin grupo asignado
        (
            public.get_current_user_role() = 'rrpp'
            AND activo = true  -- ✅ RRPP solo ve lotes activos
            AND (
                grupo IS NULL
                OR grupo = (SELECT grupo FROM public.personal WHERE id = auth.uid())
            )
        )
    )
);

COMMENT ON POLICY "RRPPs can view lotes of their grupo or without grupo" ON public.lotes IS
'Admin y Seguridad ven todos los lotes. RRPP solo ve lotes ACTIVOS de su grupo o sin grupo asignado.';

-- ========================================
-- STEP 2: Update trigger to validate lote is active when creating invitado
-- ========================================

-- Update existing increment_lote_cantidad function to check if lote is active
CREATE OR REPLACE FUNCTION increment_lote_cantidad()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lote_activo BOOLEAN;
    lote_cantidad_actual INTEGER;
    lote_cantidad_maxima INTEGER;
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Get lote details
        SELECT activo, cantidad_actual, cantidad_maxima
        INTO lote_activo, lote_cantidad_actual, lote_cantidad_maxima
        FROM public.lotes
        WHERE id = NEW.uuid_lote;

        -- Check if lote exists
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El lote seleccionado no existe';
        END IF;

        -- ✅ Check if lote is active
        IF NOT lote_activo THEN
            RAISE EXCEPTION 'Lote no disponible: El lote ha sido desactivado por el administrador';
        END IF;

        -- Check if lote is full (existing validation)
        IF lote_cantidad_actual >= lote_cantidad_maxima THEN
            RAISE EXCEPTION 'El lote está completo';
        END IF;

        -- Increment counter
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_lote_cantidad() IS 'Incrementa contador de lote y valida que esté activo y no esté completo';

-- ========================================
-- STEP 3: Update trigger for lote change to also validate active status
-- ========================================

-- Update existing update_lote_cantidad function
CREATE OR REPLACE FUNCTION update_lote_cantidad()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_lote_activo BOOLEAN;
    new_lote_cantidad_actual INTEGER;
    new_lote_cantidad_maxima INTEGER;
BEGIN
    -- If lote changed
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN
        -- Decrement old lote
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual - 1
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Increment new lote (with validations)
        IF NEW.uuid_lote IS NOT NULL THEN
            -- Get new lote details
            SELECT activo, cantidad_actual, cantidad_maxima
            INTO new_lote_activo, new_lote_cantidad_actual, new_lote_cantidad_maxima
            FROM public.lotes
            WHERE id = NEW.uuid_lote;

            -- Check if lote exists
            IF NOT FOUND THEN
                RAISE EXCEPTION 'El lote seleccionado no existe';
            END IF;

            -- ✅ Check if new lote is active
            IF NOT new_lote_activo THEN
                RAISE EXCEPTION 'Lote no disponible: El lote ha sido desactivado por el administrador';
            END IF;

            -- Check if new lote is full
            IF new_lote_cantidad_actual >= new_lote_cantidad_maxima THEN
                RAISE EXCEPTION 'El lote está completo';
            END IF;

            -- Increment counter
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_lote_cantidad() IS 'Actualiza contadores al cambiar lote de un invitado, validando que el nuevo lote esté activo';

-- ========================================
-- FINAL NOTES
-- ========================================

-- IMPORTANTE: Después de ejecutar esta migración:
-- 1. Admin y Seguridad pueden ver todos los lotes (activos e inactivos) en RLS
-- 2. RRPP solo puede ver lotes activos (activo = true) que correspondan a su grupo
-- 3. Al crear o cambiar el lote de un invitado, se valida que el lote esté activo
-- 4. Si un RRPP está creando un invitado y el admin desactiva el lote, recibirá error: "Lote no disponible"
-- 5. Los triggers ahora tienen SECURITY DEFINER para funcionar correctamente con RLS
