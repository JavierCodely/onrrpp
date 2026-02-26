-- =============================================
-- Update Migration: 009 - Fix Permisos y Triggers
-- Description: Asegurar que los triggers tengan permisos y funcionen
-- =============================================

-- ============================================
-- PASO 1: Otorgar permisos necesarios
-- ============================================

-- Los triggers necesitan poder actualizar la tabla lotes
GRANT UPDATE ON public.lotes TO authenticated;
GRANT UPDATE ON public.lotes TO anon;
GRANT UPDATE ON public.lotes TO postgres;

-- Asegurar permisos en invitados también
GRANT ALL ON public.invitados TO authenticated;
GRANT SELECT ON public.invitados TO anon;

-- ============================================
-- PASO 2: Verificar que las funciones existan
-- ============================================

-- Si las funciones no existen, recrearlas
CREATE OR REPLACE FUNCTION fn_incrementar_lote()
RETURNS TRIGGER AS $$
BEGIN
    -- Log para debugging
    RAISE NOTICE 'Trigger fn_incrementar_lote ejecutado para lote: %', NEW.uuid_lote;

    -- Solo si hay lote asignado
    IF NEW.uuid_lote IS NOT NULL THEN
        -- Incrementar contador
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1,
            updated_at = NOW()
        WHERE id = NEW.uuid_lote;

        RAISE NOTICE 'Lote % incrementado', NEW.uuid_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_decrementar_lote()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Trigger fn_decrementar_lote ejecutado para lote: %', OLD.uuid_lote;

    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = GREATEST(0, cantidad_actual - 1),
            updated_at = NOW()
        WHERE id = OLD.uuid_lote;

        RAISE NOTICE 'Lote % decrementado', OLD.uuid_lote;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_cambiar_lote()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Trigger fn_cambiar_lote ejecutado. Viejo: %, Nuevo: %', OLD.uuid_lote, NEW.uuid_lote;

    -- Solo si el lote cambió
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN
        -- Decrementar lote anterior
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = GREATEST(0, cantidad_actual - 1),
                updated_at = NOW()
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Incrementar nuevo lote
        IF NEW.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1,
                updated_at = NOW()
            WHERE id = NEW.uuid_lote;
        END IF;

        RAISE NOTICE 'Lotes actualizados correctamente';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASO 3: Recrear triggers con SECURITY DEFINER
-- ============================================

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trg_incrementar_lote ON public.invitados;
DROP TRIGGER IF EXISTS trg_decrementar_lote ON public.invitados;
DROP TRIGGER IF EXISTS trg_cambiar_lote ON public.invitados;

-- Recrear triggers
CREATE TRIGGER trg_incrementar_lote
AFTER INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION fn_incrementar_lote();

CREATE TRIGGER trg_decrementar_lote
AFTER DELETE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION fn_decrementar_lote();

CREATE TRIGGER trg_cambiar_lote
AFTER UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION fn_cambiar_lote();

-- ============================================
-- PASO 4: Sincronizar contadores
-- ============================================

UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COALESCE(COUNT(*), 0)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);

-- ============================================
-- PASO 5: Prueba automática
-- ============================================

DO $$
DECLARE
    v_test_evento UUID;
    v_test_lote UUID;
    v_test_rrpp UUID;
    v_cantidad_antes INTEGER;
    v_cantidad_despues INTEGER;
    v_test_invitado_id UUID;
BEGIN
    -- Obtener datos de prueba
    SELECT id INTO v_test_evento FROM public.eventos LIMIT 1;
    SELECT id INTO v_test_lote FROM public.lotes WHERE activo = true LIMIT 1;
    SELECT id INTO v_test_rrpp FROM public.personal WHERE rol = 'rrpp' LIMIT 1;

    IF v_test_evento IS NULL OR v_test_lote IS NULL OR v_test_rrpp IS NULL THEN
        RAISE NOTICE '⚠️  No hay datos de prueba. Crea un evento, lote y usuario RRPP primero.';
        RETURN;
    END IF;

    -- Obtener cantidad antes
    SELECT cantidad_actual INTO v_cantidad_antes FROM public.lotes WHERE id = v_test_lote;

    -- Crear invitado de prueba
    INSERT INTO public.invitados (
        nombre, apellido, edad, dni, sexo, uuid_evento, uuid_lote, id_rrpp
    ) VALUES (
        'TEST', 'TRIGGER', 25, 'TEST-' || NOW(), 'hombre', v_test_evento, v_test_lote, v_test_rrpp
    ) RETURNING id INTO v_test_invitado_id;

    -- Obtener cantidad después
    SELECT cantidad_actual INTO v_cantidad_despues FROM public.lotes WHERE id = v_test_lote;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRUEBA AUTOMÁTICA DE TRIGGERS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cantidad ANTES:   %', v_cantidad_antes;
    RAISE NOTICE 'Cantidad DESPUÉS: %', v_cantidad_despues;

    IF v_cantidad_despues = v_cantidad_antes + 1 THEN
        RAISE NOTICE '✅ ¡TRIGGER FUNCIONA CORRECTAMENTE!';
    ELSE
        RAISE NOTICE '❌ TRIGGER NO FUNCIONÓ';
        RAISE NOTICE 'Se esperaba: %', v_cantidad_antes + 1;
        RAISE NOTICE 'Se obtuvo:   %', v_cantidad_despues;
    END IF;

    -- Limpiar
    DELETE FROM public.invitados WHERE id = v_test_invitado_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Invitado de prueba eliminado';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- PASO 6: Información final
-- ============================================

DO $$
DECLARE
    v_triggers INTEGER;
    v_lotes_total INTEGER;
    v_lotes_sincronizados INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_triggers
    FROM information_schema.triggers
    WHERE event_object_table = 'invitados'
      AND trigger_name LIKE 'trg_%lote%';

    SELECT COUNT(*) INTO v_lotes_total FROM public.lotes;

    SELECT COUNT(*) INTO v_lotes_sincronizados
    FROM public.lotes l
    WHERE l.cantidad_actual = (
        SELECT COUNT(*) FROM public.invitados i WHERE i.uuid_lote = l.id
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 RESUMEN FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Triggers instalados: %/3', v_triggers;
    RAISE NOTICE 'Lotes sincronizados: %/%', v_lotes_sincronizados, v_lotes_total;
    RAISE NOTICE '';

    IF v_triggers = 3 AND v_lotes_sincronizados = v_lotes_total THEN
        RAISE NOTICE '✅ SISTEMA COMPLETAMENTE FUNCIONAL';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 Ahora los contadores se actualizarán automáticamente';
        RAISE NOTICE '🎯 Crea un invitado en tu app y verifica';
    ELSE
        RAISE NOTICE '⚠️  Revisa los números arriba';
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- Comentarios
COMMENT ON FUNCTION fn_incrementar_lote() IS 'SECURITY DEFINER: Incrementa con permisos elevados';
COMMENT ON FUNCTION fn_decrementar_lote() IS 'SECURITY DEFINER: Decrementa con permisos elevados';
COMMENT ON FUNCTION fn_cambiar_lote() IS 'SECURITY DEFINER: Cambia lote con permisos elevados';
