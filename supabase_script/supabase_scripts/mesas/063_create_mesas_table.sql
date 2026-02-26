-- Migration: 063 - Create Mesas Table
-- Description: Individual tables within sectors with positioning, pricing, and state management
-- Dependencies: 062_create_sectores_table.sql, 003_create_personal.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Create Enums
-- ============================================

-- Estado de mesa: libre, reservado, vendido
CREATE TYPE estado_mesa_type AS ENUM ('libre', 'reservado', 'vendido');

COMMENT ON TYPE estado_mesa_type IS 'Estados posibles de una mesa: libre (disponible), reservado (bloqueada por RRPP sin venta), vendido (venta confirmada con QR)';

-- ============================================
-- SECTION 2: Table Creation
-- ============================================

CREATE TABLE IF NOT EXISTS public.mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    uuid_sector UUID NOT NULL REFERENCES public.sectores(id) ON DELETE CASCADE,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Estado y Pricing
    estado estado_mesa_type NOT NULL DEFAULT 'libre',
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Control de Acceso
    max_personas INTEGER NOT NULL DEFAULT 1,
    escaneos_seguridad_count INTEGER NOT NULL DEFAULT 0,

    -- Asignación de RRPP
    id_rrpp UUID REFERENCES public.personal(id) ON DELETE SET NULL,

    -- Comisiones (solo aplica cuando estado = vendido)
    comision_tipo comision_tipo,
    comision_rrpp_monto DECIMAL(10, 2) DEFAULT 0,
    comision_rrpp_porcentaje DECIMAL(5, 2) DEFAULT 0,

    -- Consumición
    tiene_consumicion BOOLEAN NOT NULL DEFAULT false,
    monto_consumicion DECIMAL(10, 2) DEFAULT 0,
    detalle_consumicion TEXT,
    consumicion_entregada BOOLEAN NOT NULL DEFAULT false,
    id_bartender_entrega UUID REFERENCES public.personal(id) ON DELETE SET NULL,
    fecha_entrega_consumicion TIMESTAMPTZ,

    -- Posicionamiento Visual (coordenadas en la imagen del sector)
    coordenada_x DECIMAL(6, 2) NOT NULL DEFAULT 0,
    coordenada_y DECIMAL(6, 2) NOT NULL DEFAULT 0,

    -- Metadata
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT precio_valido CHECK (precio >= 0),
    CONSTRAINT max_personas_valido CHECK (max_personas > 0),
    CONSTRAINT escaneos_no_negativo CHECK (escaneos_seguridad_count >= 0),
    CONSTRAINT escaneos_no_excede_maximo CHECK (escaneos_seguridad_count <= max_personas),
    CONSTRAINT comision_monto_valido CHECK (comision_rrpp_monto >= 0),
    CONSTRAINT comision_porcentaje_valido CHECK (comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100),
    CONSTRAINT monto_consumicion_valido CHECK (monto_consumicion >= 0),
    CONSTRAINT coordenada_x_valida CHECK (coordenada_x >= 0 AND coordenada_x <= 100),
    CONSTRAINT coordenada_y_valida CHECK (coordenada_y >= 0 AND coordenada_y <= 100),
    CONSTRAINT consumicion_detalle_si_tiene CHECK (
        (tiene_consumicion = false) OR
        (tiene_consumicion = true AND detalle_consumicion IS NOT NULL)
    ),
    CONSTRAINT bartender_solo_si_entregada CHECK (
        (consumicion_entregada = false AND id_bartender_entrega IS NULL AND fecha_entrega_consumicion IS NULL) OR
        (consumicion_entregada = true AND id_bartender_entrega IS NOT NULL AND fecha_entrega_consumicion IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX idx_mesas_uuid_sector ON public.mesas(uuid_sector);
CREATE INDEX idx_mesas_uuid_evento ON public.mesas(uuid_evento);
CREATE INDEX idx_mesas_uuid_club ON public.mesas(uuid_club);
CREATE INDEX idx_mesas_estado ON public.mesas(estado);
CREATE INDEX idx_mesas_id_rrpp ON public.mesas(id_rrpp);
CREATE INDEX idx_mesas_activo ON public.mesas(activo);
CREATE INDEX idx_mesas_tiene_consumicion ON public.mesas(tiene_consumicion);
CREATE INDEX idx_mesas_consumicion_entregada ON public.mesas(consumicion_entregada);

-- Add comments
COMMENT ON TABLE public.mesas IS 'Mesas individuales dentro de sectores con estado, precio, y tracking de escaneos';
COMMENT ON COLUMN public.mesas.nombre IS 'Nombre o numero de la mesa (ej: Mesa 1, VIP-A)';
COMMENT ON COLUMN public.mesas.estado IS 'Estado actual: libre, reservado, o vendido';
COMMENT ON COLUMN public.mesas.precio IS 'Precio de la mesa';
COMMENT ON COLUMN public.mesas.max_personas IS 'Maximo numero de personas (limite de escaneos seguridad)';
COMMENT ON COLUMN public.mesas.escaneos_seguridad_count IS 'Contador de escaneos realizados por seguridad';
COMMENT ON COLUMN public.mesas.id_rrpp IS 'RRPP asignado (cuando reservado o vendido)';
COMMENT ON COLUMN public.mesas.comision_tipo IS 'Tipo de comision: monto fijo o porcentaje';
COMMENT ON COLUMN public.mesas.comision_rrpp_monto IS 'Comision en monto fijo';
COMMENT ON COLUMN public.mesas.comision_rrpp_porcentaje IS 'Comision en porcentaje (0-100)';
COMMENT ON COLUMN public.mesas.tiene_consumicion IS 'Si incluye consumicion prepagada';
COMMENT ON COLUMN public.mesas.monto_consumicion IS 'Valor de la consumicion incluida';
COMMENT ON COLUMN public.mesas.detalle_consumicion IS 'Descripcion de lo que incluye (ej: 1 botella vodka + mixers)';
COMMENT ON COLUMN public.mesas.consumicion_entregada IS 'Si el bartender ya entrego la consumicion';
COMMENT ON COLUMN public.mesas.id_bartender_entrega IS 'Bartender que entrego la consumicion';
COMMENT ON COLUMN public.mesas.fecha_entrega_consumicion IS 'Timestamp de cuando se entrego';
COMMENT ON COLUMN public.mesas.coordenada_x IS 'Posicion horizontal en la imagen (0-100, porcentaje)';
COMMENT ON COLUMN public.mesas.coordenada_y IS 'Posicion vertical en la imagen (0-100, porcentaje)';

-- ============================================
-- SECTION 3: Validation Trigger
-- ============================================

-- Validate business rules on insert/update
CREATE OR REPLACE FUNCTION validate_mesa_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate estado changes
    IF NEW.estado = 'libre' THEN
        -- Mesa libre no debe tener RRPP asignado
        IF NEW.id_rrpp IS NOT NULL THEN
            RAISE EXCEPTION 'Una mesa libre no puede tener RRPP asignado';
        END IF;
        -- Reset escaneos y consumicion
        NEW.escaneos_seguridad_count := 0;
        NEW.consumicion_entregada := false;
        NEW.id_bartender_entrega := NULL;
        NEW.fecha_entrega_consumicion := NULL;

    ELSIF NEW.estado = 'reservado' THEN
        -- Mesa reservada debe tener RRPP
        IF NEW.id_rrpp IS NULL THEN
            RAISE EXCEPTION 'Una mesa reservada debe tener un RRPP asignado';
        END IF;

    ELSIF NEW.estado = 'vendido' THEN
        -- Mesa vendida debe tener RRPP
        IF NEW.id_rrpp IS NULL THEN
            RAISE EXCEPTION 'Una mesa vendida debe tener un RRPP asignado';
        END IF;
        -- Mesa vendida debe tener comision configurada
        IF NEW.comision_tipo IS NULL THEN
            RAISE EXCEPTION 'Una mesa vendida debe tener tipo de comision definido';
        END IF;
    END IF;

    -- Validate that id_rrpp has 'rrpp' role if assigned
    IF NEW.id_rrpp IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.personal
            WHERE id = NEW.id_rrpp
            AND rol = 'rrpp'
            AND activo = true
            AND uuid_club = NEW.uuid_club
        ) THEN
            RAISE EXCEPTION 'El RRPP asignado no existe, no tiene rol RRPP, o no pertenece al mismo club';
        END IF;
    END IF;

    -- Validate that id_bartender_entrega has 'bartender' role if assigned
    IF NEW.id_bartender_entrega IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.personal
            WHERE id = NEW.id_bartender_entrega
            AND rol = 'bartender'
            AND activo = true
            AND uuid_club = NEW.uuid_club
        ) THEN
            RAISE EXCEPTION 'El bartender asignado no existe, no tiene rol bartender, o no pertenece al mismo club';
        END IF;
    END IF;

    -- Validate sector belongs to same evento and club
    IF NOT EXISTS (
        SELECT 1 FROM public.sectores
        WHERE id = NEW.uuid_sector
        AND uuid_evento = NEW.uuid_evento
        AND uuid_club = NEW.uuid_club
    ) THEN
        RAISE EXCEPTION 'El sector debe pertenecer al mismo evento y club que la mesa';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_mesa_state
    BEFORE INSERT OR UPDATE ON public.mesas
    FOR EACH ROW
    EXECUTE FUNCTION validate_mesa_state();

COMMENT ON FUNCTION validate_mesa_state IS 'Valida reglas de negocio: estados, roles, y relaciones entre mesa, sector, evento y club';

-- ============================================
-- SECTION 4: Trigger for updated_at
-- ============================================

CREATE TRIGGER trigger_mesas_updated_at
    BEFORE UPDATE ON public.mesas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SECTION 5: RLS Policies
-- ============================================

ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view mesas from their club
CREATE POLICY "Users can view mesas from their club"
ON public.mesas
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- INSERT: Only admins can create mesas
CREATE POLICY "Admins can create mesas"
ON public.mesas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- UPDATE: Admins can update all mesas, RRPP can update their own mesas (estado, only certain fields)
CREATE POLICY "Admins can update all mesas"
ON public.mesas
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

CREATE POLICY "RRPP can update their own mesas"
ON public.mesas
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_club = public.get_current_user_club()
);

-- DELETE: Only admins can delete mesas
CREATE POLICY "Admins can delete mesas"
ON public.mesas
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mesas') THEN
        RAISE NOTICE '✅ Table mesas created successfully';
    END IF;

    -- Check enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_mesa_type') THEN
        RAISE NOTICE '✅ Enum estado_mesa_type created';
    END IF;

    -- Check RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'mesas' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS enabled on mesas';
    END IF;

    -- Check policies exist
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'mesas') >= 4 THEN
        RAISE NOTICE '✅ RLS policies created for mesas';
    END IF;

    -- Check triggers exist
    IF (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'mesas') >= 2 THEN
        RAISE NOTICE '✅ Triggers created for mesas';
    END IF;

    RAISE NOTICE '✅ Migration 063 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_validate_mesa_state ON public.mesas;
DROP TRIGGER IF EXISTS trigger_mesas_updated_at ON public.mesas;
DROP FUNCTION IF EXISTS validate_mesa_state();

-- Drop table
DROP TABLE IF EXISTS public.mesas CASCADE;

-- Drop enum
DROP TYPE IF EXISTS estado_mesa_type;
*/
