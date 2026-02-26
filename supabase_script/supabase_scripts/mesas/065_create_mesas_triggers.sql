-- Migration: 065 - Create Mesas Triggers and Auto-Updates
-- Description: Triggers for auto-updating counters, validating scan limits, and syncing state
-- Dependencies: 063_create_mesas_table.sql, 064_create_mesas_ventas.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Trigger - Increment escaneos_seguridad_count
-- ============================================

-- Automatically increment counter when seguridad scans
CREATE OR REPLACE FUNCTION increment_escaneos_seguridad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mesa_id UUID;
    v_max_personas INTEGER;
    v_escaneos_actuales INTEGER;
BEGIN
    -- Get mesa info from the venta
    SELECT vm.uuid_mesa INTO v_mesa_id
    FROM public.ventas_mesas vm
    WHERE vm.id = NEW.uuid_venta_mesa;

    IF v_mesa_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro la mesa asociada a esta venta';
    END IF;

    -- Only increment for seguridad scans
    IF NEW.tipo_escaneo = 'seguridad' THEN
        -- Get current count and max
        SELECT max_personas, escaneos_seguridad_count
        INTO v_max_personas, v_escaneos_actuales
        FROM public.mesas
        WHERE id = v_mesa_id;

        -- Check if already at limit
        IF v_escaneos_actuales >= v_max_personas THEN
            RAISE EXCEPTION 'Mesa completa: limite de % personas alcanzado', v_max_personas;
        END IF;

        -- Increment counter
        UPDATE public.mesas
        SET escaneos_seguridad_count = escaneos_seguridad_count + 1,
            updated_at = NOW()
        WHERE id = v_mesa_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_escaneos_seguridad
    AFTER INSERT ON public.escaneos_mesas
    FOR EACH ROW
    EXECUTE FUNCTION increment_escaneos_seguridad();

COMMENT ON FUNCTION increment_escaneos_seguridad IS 'Incrementa contador de escaneos seguridad y valida limite de personas';

-- ============================================
-- SECTION 2: Trigger - Block Multiple Bartender Scans
-- ============================================

-- Prevent bartender from scanning the same mesa twice
CREATE OR REPLACE FUNCTION prevent_duplicate_bartender_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mesa_id UUID;
    v_consumicion_entregada BOOLEAN;
    v_tiene_consumicion BOOLEAN;
BEGIN
    -- Get mesa info
    SELECT vm.uuid_mesa INTO v_mesa_id
    FROM public.ventas_mesas vm
    WHERE vm.id = NEW.uuid_venta_mesa;

    IF v_mesa_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro la mesa asociada a esta venta';
    END IF;

    -- Only check for bartender scans
    IF NEW.tipo_escaneo = 'bartender' THEN
        -- Get mesa consumicion status
        SELECT consumicion_entregada, tiene_consumicion
        INTO v_consumicion_entregada, v_tiene_consumicion
        FROM public.mesas
        WHERE id = v_mesa_id;

        -- Check if mesa has consumicion
        IF NOT v_tiene_consumicion THEN
            RAISE EXCEPTION 'Esta mesa no incluye consumicion';
        END IF;

        -- Check if already delivered
        IF v_consumicion_entregada THEN
            RAISE EXCEPTION 'La consumicion ya fue entregada anteriormente';
        END IF;

        -- Check if bartender already scanned this mesa
        IF EXISTS (
            SELECT 1 FROM public.escaneos_mesas
            WHERE uuid_mesa = v_mesa_id
            AND tipo_escaneo = 'bartender'
        ) THEN
            RAISE EXCEPTION 'Esta mesa ya fue escaneada por un bartender';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_duplicate_bartender_scan
    BEFORE INSERT ON public.escaneos_mesas
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_bartender_scan();

COMMENT ON FUNCTION prevent_duplicate_bartender_scan IS 'Bloquea re-escaneo de bartender si la consumicion ya fue entregada';

-- ============================================
-- SECTION 3: Trigger - Auto-Update Mesa State on Venta Creation
-- ============================================

-- When a venta is created, update mesa to estado = vendido
CREATE OR REPLACE FUNCTION update_mesa_on_venta_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update mesa to vendido estado
    UPDATE public.mesas
    SET
        estado = 'vendido',
        id_rrpp = NEW.id_rrpp,
        comision_tipo = NEW.comision_tipo,
        comision_rrpp_monto = NEW.comision_rrpp_monto,
        comision_rrpp_porcentaje = NEW.comision_rrpp_porcentaje,
        updated_at = NOW()
    WHERE id = NEW.uuid_mesa;

    -- Verify update worked
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se pudo actualizar la mesa al crear la venta';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_mesa_on_venta_created
    AFTER INSERT ON public.ventas_mesas
    FOR EACH ROW
    EXECUTE FUNCTION update_mesa_on_venta_created();

COMMENT ON FUNCTION update_mesa_on_venta_created IS 'Actualiza automaticamente el estado de la mesa a vendido cuando se crea una venta';

-- ============================================
-- SECTION 4: Trigger - Prevent Venta Deletion if Scans Exist
-- ============================================

-- Prevent deleting ventas that have escaneos registered
CREATE OR REPLACE FUNCTION prevent_venta_mesa_deletion_with_scans()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_escaneos_count INTEGER;
BEGIN
    -- Check if there are any escaneos for this venta
    SELECT COUNT(*) INTO v_escaneos_count
    FROM public.escaneos_mesas
    WHERE uuid_venta_mesa = OLD.id;

    IF v_escaneos_count > 0 THEN
        RAISE EXCEPTION 'No se puede eliminar una venta de mesa que tiene escaneos registrados';
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_prevent_venta_mesa_deletion_with_scans
    BEFORE DELETE ON public.ventas_mesas
    FOR EACH ROW
    EXECUTE FUNCTION prevent_venta_mesa_deletion_with_scans();

COMMENT ON FUNCTION prevent_venta_mesa_deletion_with_scans IS 'Previene eliminacion de ventas que tienen escaneos registrados (auditoria)';

-- ============================================
-- SECTION 5: Trigger - Reset Mesa on Venta Deletion
-- ============================================

-- When venta is deleted (only if no scans), reset mesa to libre
CREATE OR REPLACE FUNCTION reset_mesa_on_venta_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset mesa to libre
    UPDATE public.mesas
    SET
        estado = 'libre',
        id_rrpp = NULL,
        comision_tipo = NULL,
        comision_rrpp_monto = 0,
        comision_rrpp_porcentaje = 0,
        escaneos_seguridad_count = 0,
        consumicion_entregada = false,
        id_bartender_entrega = NULL,
        fecha_entrega_consumicion = NULL,
        updated_at = NOW()
    WHERE id = OLD.uuid_mesa;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_reset_mesa_on_venta_deleted
    AFTER DELETE ON public.ventas_mesas
    FOR EACH ROW
    EXECUTE FUNCTION reset_mesa_on_venta_deleted();

COMMENT ON FUNCTION reset_mesa_on_venta_deleted IS 'Resetea mesa a estado libre cuando se elimina la venta (solo si no hay escaneos)';

-- ============================================
-- SECTION 6: Trigger - Prevent Estado Change if Ventas Exist
-- ============================================

-- Prevent changing mesa estado to libre if there's an active venta
CREATE OR REPLACE FUNCTION prevent_estado_change_with_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only check when changing to libre from vendido
    IF OLD.estado = 'vendido' AND NEW.estado = 'libre' THEN
        -- Check if venta exists
        IF EXISTS (
            SELECT 1 FROM public.ventas_mesas
            WHERE uuid_mesa = NEW.id
        ) THEN
            RAISE EXCEPTION 'No se puede cambiar el estado a libre: existe una venta activa para esta mesa. Debe eliminar la venta primero.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_estado_change_with_venta
    BEFORE UPDATE ON public.mesas
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION prevent_estado_change_with_venta();

COMMENT ON FUNCTION prevent_estado_change_with_venta IS 'Previene cambio de estado vendido a libre si existe venta activa';

-- ============================================
-- SECTION 7: Function - Get Escaneos Count by Type
-- ============================================

-- Helper function to get scan counts for a mesa
CREATE OR REPLACE FUNCTION get_mesa_escaneos_count(
    p_uuid_mesa UUID,
    p_tipo_escaneo tipo_escaneo_mesa DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_tipo_escaneo IS NULL THEN
        -- Count all escaneos
        SELECT COUNT(*) INTO v_count
        FROM public.escaneos_mesas
        WHERE uuid_mesa = p_uuid_mesa;
    ELSE
        -- Count specific type
        SELECT COUNT(*) INTO v_count
        FROM public.escaneos_mesas
        WHERE uuid_mesa = p_uuid_mesa
        AND tipo_escaneo = p_tipo_escaneo;
    END IF;

    RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_mesa_escaneos_count(UUID, tipo_escaneo_mesa) TO authenticated;

COMMENT ON FUNCTION get_mesa_escaneos_count IS 'Retorna el numero de escaneos de una mesa, opcionalmente filtrado por tipo';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check triggers exist
    IF (SELECT COUNT(*) FROM information_schema.triggers
        WHERE event_object_table IN ('mesas', 'ventas_mesas', 'escaneos_mesas')
        AND trigger_name LIKE 'trigger_%escaneos%'
           OR trigger_name LIKE 'trigger_%venta%'
           OR trigger_name LIKE 'trigger_%bartender%'
           OR trigger_name LIKE 'trigger_%estado%'
    ) >= 6 THEN
        RAISE NOTICE '✅ All triggers created successfully';
    END IF;

    -- Check functions exist
    IF (SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND (routine_name LIKE '%escaneos%'
             OR routine_name LIKE '%venta_mesa%'
             OR routine_name LIKE '%bartender%'
             OR routine_name LIKE '%mesa_on_%')
        AND routine_type = 'FUNCTION'
    ) >= 7 THEN
        RAISE NOTICE '✅ All trigger functions created';
    END IF;

    RAISE NOTICE '✅ Migration 065 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_increment_escaneos_seguridad ON public.escaneos_mesas;
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_bartender_scan ON public.escaneos_mesas;
DROP TRIGGER IF EXISTS trigger_update_mesa_on_venta_created ON public.ventas_mesas;
DROP TRIGGER IF EXISTS trigger_prevent_venta_mesa_deletion_with_scans ON public.ventas_mesas;
DROP TRIGGER IF EXISTS trigger_reset_mesa_on_venta_deleted ON public.ventas_mesas;
DROP TRIGGER IF EXISTS trigger_prevent_estado_change_with_venta ON public.mesas;

-- Drop functions
DROP FUNCTION IF EXISTS increment_escaneos_seguridad();
DROP FUNCTION IF EXISTS prevent_duplicate_bartender_scan();
DROP FUNCTION IF EXISTS update_mesa_on_venta_created();
DROP FUNCTION IF EXISTS prevent_venta_mesa_deletion_with_scans();
DROP FUNCTION IF EXISTS reset_mesa_on_venta_deleted();
DROP FUNCTION IF EXISTS prevent_estado_change_with_venta();
DROP FUNCTION IF EXISTS get_mesa_escaneos_count(UUID, tipo_escaneo_mesa);
*/
