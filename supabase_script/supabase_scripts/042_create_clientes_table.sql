-- =============================================
-- Migration: 042 - Create Clientes Table (GLOBAL)
-- Description: Global client database - Shared across all clubs
-- Dependencies: 001_create_enums.sql, 002_create_clubs.sql, 003_create_personal.sql
-- Version: 2.0 (GLOBAL)
-- =============================================

-- Create clientes table (GLOBAL - sin uuid_club)
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT NOT NULL UNIQUE, -- DNI único GLOBAL
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    edad INTEGER,
    fecha_nacimiento DATE,
    sexo sexo_type NOT NULL,
    departamento TEXT,
    localidad TEXT,
    id_rrpp_creador UUID NOT NULL REFERENCES public.personal(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT edad_cliente_valida CHECK (edad IS NULL OR (edad >= 16 AND edad <= 100))
);

-- Create clientes_ingresos_por_club table
-- Esta tabla trackea cuántas veces un cliente ingresó a eventos de cada club
CREATE TABLE public.clientes_ingresos_por_club (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_cliente UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    ingresos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un cliente puede tener un registro de ingresos por club
    CONSTRAINT cliente_club_unico UNIQUE (uuid_cliente, uuid_club),
    CONSTRAINT ingresos_no_negativo CHECK (ingresos >= 0)
);

-- Create indexes for clientes
CREATE INDEX idx_clientes_dni ON public.clientes(dni);
CREATE INDEX idx_clientes_nombre_apellido ON public.clientes(nombre, apellido);
CREATE INDEX idx_clientes_departamento ON public.clientes(departamento);
CREATE INDEX idx_clientes_localidad ON public.clientes(localidad);
CREATE INDEX idx_clientes_id_rrpp_creador ON public.clientes(id_rrpp_creador);

-- Create indexes for clientes_ingresos_por_club
CREATE INDEX idx_clientes_ingresos_uuid_cliente ON public.clientes_ingresos_por_club(uuid_cliente);
CREATE INDEX idx_clientes_ingresos_uuid_club ON public.clientes_ingresos_por_club(uuid_club);

-- Add comments
COMMENT ON TABLE public.clientes IS 'Tabla GLOBAL de clientes - Compartida entre todos los clubs';
COMMENT ON COLUMN public.clientes.dni IS 'DNI del cliente (único a nivel GLOBAL - no solo por club)';
COMMENT ON COLUMN public.clientes.nombre IS 'Nombre del cliente';
COMMENT ON COLUMN public.clientes.apellido IS 'Apellido del cliente';
COMMENT ON COLUMN public.clientes.edad IS 'Edad del cliente';
COMMENT ON COLUMN public.clientes.fecha_nacimiento IS 'Fecha de nacimiento del cliente';
COMMENT ON COLUMN public.clientes.sexo IS 'Sexo del cliente';
COMMENT ON COLUMN public.clientes.departamento IS 'Departamento del cliente';
COMMENT ON COLUMN public.clientes.localidad IS 'Localidad del cliente';
COMMENT ON COLUMN public.clientes.id_rrpp_creador IS 'RRPP que creó este cliente por primera vez';

COMMENT ON TABLE public.clientes_ingresos_por_club IS 'Contador de ingresos de cada cliente por club';
COMMENT ON COLUMN public.clientes_ingresos_por_club.uuid_cliente IS 'Cliente';
COMMENT ON COLUMN public.clientes_ingresos_por_club.uuid_club IS 'Club';
COMMENT ON COLUMN public.clientes_ingresos_por_club.ingresos IS 'Cantidad de veces que el cliente ingresó a eventos de este club';

-- Trigger for updated_at on clientes
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on clientes_ingresos_por_club
CREATE TRIGGER update_clientes_ingresos_por_club_updated_at
    BEFORE UPDATE ON public.clientes_ingresos_por_club
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_ingresos_por_club ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES for clientes (TODOS PUEDEN VER TODOS)
-- ========================================

-- RLS Policy: TODOS los usuarios autenticados pueden ver TODOS los clientes
CREATE POLICY "All users can view all clientes"
ON public.clientes
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- RLS Policy: RRPP y Admin pueden crear clientes
CREATE POLICY "RRPP and Admin can create clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
    public.check_user_has_role('rrpp'::user_role) OR public.check_user_has_role('admin'::user_role)
);

-- RLS Policy: RRPP y Admin pueden actualizar clientes
CREATE POLICY "RRPP and Admin can update clientes"
ON public.clientes
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role) OR public.check_user_has_role('admin'::user_role)
);

-- RLS Policy: Solo Admin puede eliminar clientes
CREATE POLICY "Admin can delete clientes"
ON public.clientes
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
);

-- ========================================
-- RLS POLICIES for clientes_ingresos_por_club
-- ========================================

-- RLS Policy: Usuarios pueden ver ingresos de su club
CREATE POLICY "Users can view ingresos of their club"
ON public.clientes_ingresos_por_club
FOR SELECT
USING (
    uuid_club = public.get_current_user_club()
);

-- RLS Policy: Sistema puede insertar/actualizar (triggers)
CREATE POLICY "System can manage ingresos"
ON public.clientes_ingresos_por_club
FOR ALL
USING (true)
WITH CHECK (true);
