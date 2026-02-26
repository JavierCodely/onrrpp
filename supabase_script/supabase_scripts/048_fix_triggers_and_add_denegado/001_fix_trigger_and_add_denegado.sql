-- =============================================
-- Migration: 048 - Fix Triggers and Add Denegado Field
-- Description: Fix fecha_nacimiento error in triggers, add denegado field to clientes
-- Dependencies: 042_create_clientes_table.sql, 044_create_cliente_triggers_and_validations.sql
-- =============================================

-- ========================================
-- STEP 1: Add denegado field to clientes
-- ========================================

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS denegado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS denegado_razon TEXT;

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS denegado_fecha TIMESTAMPTZ;

-- Index for quick lookup of denied clients
CREATE INDEX IF NOT EXISTS idx_clientes_denegado ON public.clientes(denegado) WHERE denegado = true;

COMMENT ON COLUMN public.clientes.denegado IS 'Si el cliente tiene prohibido el ingreso a cualquier evento';
COMMENT ON COLUMN public.clientes.denegado_razon IS 'Razon por la cual se denego el ingreso';
COMMENT ON COLUMN public.clientes.denegado_fecha IS 'Fecha en que se denego el ingreso';

-- ========================================
-- STEP 2: Fix auto_create_or_find_cliente trigger
-- Remove fecha_nacimiento references since invitados table doesn't have that field
-- ========================================

CREATE OR REPLACE FUNCTION auto_create_or_find_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id UUID;
    v_cliente_denegado BOOLEAN;
BEGIN
    -- Buscar si ya existe un cliente con ese DNI (GLOBAL - sin filtro de club)
    SELECT id, denegado INTO v_cliente_id, v_cliente_denegado
    FROM public.clientes
    WHERE dni = NEW.dni;

    -- Si el cliente existe, asignarlo al invitado
    IF v_cliente_id IS NOT NULL THEN
        -- Verificar si el cliente esta denegado
        IF v_cliente_denegado = true THEN
            RAISE EXCEPTION 'Cliente denegado: Se prohibio el ingreso. Acercate al club para aclarar tu situacion.';
        END IF;

        NEW.uuid_cliente := v_cliente_id;

        -- Auto-completar los datos del invitado desde el cliente existente
        -- NO incluye fecha_nacimiento porque invitados no tiene ese campo
        SELECT
            nombre,
            apellido,
            edad,
            sexo,
            departamento,
            localidad
        INTO
            NEW.nombre,
            NEW.apellido,
            NEW.edad,
            NEW.sexo,
            NEW.departamento,
            NEW.localidad
        FROM public.clientes
        WHERE id = v_cliente_id;

        RAISE NOTICE 'Cliente existente encontrado (DNI: %). Datos autocompletados.', NEW.dni;

    ELSE
        -- Si el cliente NO existe, crearlo con el RRPP actual como creador
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
            NEW.id_rrpp  -- El RRPP que crea el invitado es el creador del cliente
        )
        RETURNING id INTO v_cliente_id;

        NEW.uuid_cliente := v_cliente_id;

        RAISE NOTICE 'Nuevo cliente creado (DNI: %) por RRPP: %', NEW.dni, NEW.id_rrpp;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_or_find_cliente IS 'Auto-crea o busca un cliente GLOBALMENTE por DNI. Verifica si esta denegado. Si existe, autocompleta datos.';

-- ========================================
-- STEP 3: Fix sync_cliente_data_on_invitado_update trigger
-- Remove fecha_nacimiento references
-- ========================================

CREATE OR REPLACE FUNCTION sync_cliente_data_on_invitado_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo actualizar si cambio algun dato personal
    IF NEW.uuid_cliente IS NOT NULL AND (
        OLD.nombre IS DISTINCT FROM NEW.nombre OR
        OLD.apellido IS DISTINCT FROM NEW.apellido OR
        OLD.edad IS DISTINCT FROM NEW.edad OR
        OLD.sexo IS DISTINCT FROM NEW.sexo OR
        OLD.departamento IS DISTINCT FROM NEW.departamento OR
        OLD.localidad IS DISTINCT FROM NEW.localidad
    ) THEN
        UPDATE public.clientes
        SET
            nombre = NEW.nombre,
            apellido = NEW.apellido,
            edad = NEW.edad,
            sexo = NEW.sexo,
            departamento = NEW.departamento,
            localidad = NEW.localidad
        WHERE id = NEW.uuid_cliente;

        RAISE NOTICE 'Datos del cliente % actualizados', NEW.uuid_cliente;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_cliente_data_on_invitado_update IS 'Sincroniza los datos del cliente cuando se actualiza un invitado (permite correcciones globales)';

-- ========================================
-- STEP 4: Create function to check if client is denied
-- ========================================

CREATE OR REPLACE FUNCTION public.check_cliente_denegado(p_dni TEXT)
RETURNS TABLE (
    existe BOOLEAN,
    denegado BOOLEAN,
    cliente_id UUID,
    nombre TEXT,
    apellido TEXT,
    edad INTEGER,
    sexo TEXT,
    departamento TEXT,
    localidad TEXT,
    denegado_razon TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        true as existe,
        c.denegado,
        c.id as cliente_id,
        c.nombre,
        c.apellido,
        c.edad,
        c.sexo::TEXT,
        c.departamento,
        c.localidad,
        c.denegado_razon
    FROM public.clientes c
    WHERE c.dni = p_dni;

    -- If no rows returned, return a single row with existe = false
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false as existe,
            false as denegado,
            NULL::UUID as cliente_id,
            NULL::TEXT as nombre,
            NULL::TEXT as apellido,
            NULL::INTEGER as edad,
            NULL::TEXT as sexo,
            NULL::TEXT as departamento,
            NULL::TEXT as localidad,
            NULL::TEXT as denegado_razon;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cliente_denegado(TEXT) TO authenticated;

COMMENT ON FUNCTION public.check_cliente_denegado IS 'Verifica si un cliente existe y si esta denegado por DNI';

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MIGRACION 048 COMPLETADA';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios realizados:';
    RAISE NOTICE '  1. Campo denegado agregado a clientes';
    RAISE NOTICE '  2. Campo denegado_razon agregado a clientes';
    RAISE NOTICE '  3. Campo denegado_fecha agregado a clientes';
    RAISE NOTICE '  4. Trigger auto_create_or_find_cliente corregido';
    RAISE NOTICE '  5. Trigger sync_cliente_data_on_invitado_update corregido';
    RAISE NOTICE '  6. Funcion check_cliente_denegado creada';
    RAISE NOTICE '';
    RAISE NOTICE 'Funcionalidades:';
    RAISE NOTICE '  - Clientes denegados no pueden generar QR';
    RAISE NOTICE '  - Error claro cuando se intenta crear invitado denegado';
    RAISE NOTICE '  - Funcion para verificar estado del cliente por DNI';
    RAISE NOTICE '================================================';
END $$;
