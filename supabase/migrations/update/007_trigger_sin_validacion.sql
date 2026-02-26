-- =============================================
-- Update Migration: 007 - Trigger SIN Validación (TEMPORAL)
-- Description: Permite crear invitados SIN validar lote mientras diagnosticamos
-- =============================================

-- Drop trigger de validación
DROP TRIGGER IF EXISTS trigger_incrementar_lote_al_crear ON public.invitados;

-- Crear función que NO valida, solo incrementa
CREATE OR REPLACE FUNCTION incrementar_lote_sin_validar()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay lote asignado, incrementar
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Intentar incrementar, ignorar si falla
        BEGIN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar errores, permitir que continúe
            RAISE NOTICE 'No se pudo incrementar lote %, pero se permitió el insert', NEW.uuid_lote;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger SIN validación
CREATE TRIGGER trigger_incrementar_lote_al_crear
AFTER INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION incrementar_lote_sin_validar();

-- Mensaje
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger temporal instalado: Permite crear invitados SIN validar lote';
    RAISE NOTICE '⚠️  IMPORTANTE: Esto es TEMPORAL mientras diagnosticamos';
    RAISE NOTICE '⚠️  Los lotes pueden superar su máximo';
END $$;

COMMENT ON FUNCTION incrementar_lote_sin_validar() IS 'TEMPORAL: Incrementa sin validar. Permite diagnóstico.';
