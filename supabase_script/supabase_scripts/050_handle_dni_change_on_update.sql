-- =============================================
-- Migration: 050 - Handle DNI Change on Invitado Update
-- Description: Auto-create or find cliente when DNI changes during UPDATE
-- Dependencies: 044_create_cliente_triggers_and_validations.sql
-- =============================================

-- ========================================
-- FUNCIÓN: Manejar cambio de DNI en UPDATE de invitado
-- ========================================

CREATE OR REPLACE FUNCTION handle_dni_change_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id UUID;
    v_old_cliente_data RECORD;
BEGIN
    -- Solo ejecutar si el DNI cambió
    IF OLD.dni IS DISTINCT FROM NEW.dni THEN
        RAISE NOTICE '🔄 DNI cambió de % a %', OLD.dni, NEW.dni;

        -- Buscar si ya existe un cliente con el nuevo DNI (GLOBAL)
        SELECT id INTO v_cliente_id
        FROM public.clientes
        WHERE dni = NEW.dni;

        IF v_cliente_id IS NOT NULL THEN
            -- El cliente con el nuevo DNI ya existe
            -- Asignar ese cliente al invitado y autocompletar datos
            NEW.uuid_cliente := v_cliente_id;

            SELECT
                nombre,
                apellido,
                edad,
                sexo,
                departamento,
                localidad
            INTO v_old_cliente_data
            FROM public.clientes
            WHERE id = v_cliente_id;

            -- Solo autocompletar si los datos del invitado están vacíos
            -- (para permitir que el RRPP sobrescriba los datos si los ingresó)
            IF NEW.nombre IS NULL OR NEW.nombre = '' THEN
                NEW.nombre := v_old_cliente_data.nombre;
            END IF;
            IF NEW.apellido IS NULL OR NEW.apellido = '' THEN
                NEW.apellido := v_old_cliente_data.apellido;
            END IF;
            IF NEW.edad IS NULL THEN
                NEW.edad := v_old_cliente_data.edad;
            END IF;
            IF NEW.sexo IS NULL THEN
                NEW.sexo := v_old_cliente_data.sexo;
            END IF;
            IF NEW.departamento IS NULL OR NEW.departamento = '' THEN
                NEW.departamento := v_old_cliente_data.departamento;
            END IF;
            IF NEW.localidad IS NULL OR NEW.localidad = '' THEN
                NEW.localidad := v_old_cliente_data.localidad;
            END IF;

            RAISE NOTICE '✅ Cliente existente encontrado para nuevo DNI: %. Vinculado a invitado.', NEW.dni;

        ELSE
            -- El cliente con el nuevo DNI NO existe, crear uno nuevo
            INSERT INTO public.clientes (
                dni,
                nombre,
                apellido,
                edad,
                sexo,
                departamento,
                localidad,
                id_rrpp_creador
            ) VALUES (
                NEW.dni,
                NEW.nombre,
                NEW.apellido,
                NEW.edad,
                NEW.sexo,
                NEW.departamento,
                NEW.localidad,
                NEW.id_rrpp
            )
            RETURNING id INTO v_cliente_id;

            NEW.uuid_cliente := v_cliente_id;

            RAISE NOTICE '✅ Nuevo cliente creado para DNI: % (ID: %)', NEW.dni, v_cliente_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_dni_change_on_update IS 'Maneja el cambio de DNI en UPDATE: busca o crea cliente con el nuevo DNI';

-- ========================================
-- TRIGGER: Ejecutar BEFORE UPDATE cuando cambie el DNI
-- ========================================

DROP TRIGGER IF EXISTS trigger_handle_dni_change_on_update ON public.invitados;

CREATE TRIGGER trigger_handle_dni_change_on_update
BEFORE UPDATE ON public.invitados
FOR EACH ROW
WHEN (OLD.dni IS DISTINCT FROM NEW.dni)
EXECUTE FUNCTION handle_dni_change_on_update();

-- ========================================
-- VERIFICACIÓN
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '✅ TRIGGER PARA CAMBIO DE DNI CREADO';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Trigger: trigger_handle_dni_change_on_update';
    RAISE NOTICE '   Evento: BEFORE UPDATE';
    RAISE NOTICE '   Condición: Cuando OLD.dni != NEW.dni';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Comportamiento:';
    RAISE NOTICE '   - Si el nuevo DNI existe en clientes:';
    RAISE NOTICE '     → Vincula el invitado al cliente existente';
    RAISE NOTICE '   - Si el nuevo DNI NO existe:';
    RAISE NOTICE '     → Crea un nuevo cliente con los datos del invitado';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ══════════════════════════════════════════';
END $$;
