-- =============================================
-- Migration: 005 - Create Invitados Table
-- Description: Guest list table - RRPP manages guests per event
-- =============================================

-- Create invitados table
CREATE TABLE public.invitados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    edad INTEGER,
    ubicacion TEXT,
    dni TEXT NOT NULL,
    sexo sexo_type NOT NULL,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    id_rrpp UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    ingresado BOOLEAN NOT NULL DEFAULT false,
    fecha_ingreso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT edad_invitado_valida CHECK (edad IS NULL OR (edad >= 16 AND edad <= 100)),
    CONSTRAINT dni_unico_por_evento UNIQUE (dni, uuid_evento)
);

-- Create indexes
CREATE INDEX idx_invitados_uuid_evento ON public.invitados(uuid_evento);
CREATE INDEX idx_invitados_id_rrpp ON public.invitados(id_rrpp);
CREATE INDEX idx_invitados_ingresado ON public.invitados(ingresado);
CREATE INDEX idx_invitados_dni ON public.invitados(dni);
CREATE INDEX idx_invitados_nombre_apellido ON public.invitados(nombre, apellido);
CREATE INDEX idx_invitados_evento_ingresado ON public.invitados(uuid_evento, ingresado);

-- Add comments
COMMENT ON TABLE public.invitados IS 'Lista de invitados - RRPP gestiona sus invitados por evento';
COMMENT ON COLUMN public.invitados.nombre IS 'Nombre del invitado';
COMMENT ON COLUMN public.invitados.apellido IS 'Apellido del invitado';
COMMENT ON COLUMN public.invitados.edad IS 'Edad del invitado';
COMMENT ON COLUMN public.invitados.dni IS 'DNI del invitado';
COMMENT ON COLUMN public.invitados.sexo IS 'Sexo del invitado';
COMMENT ON COLUMN public.invitados.uuid_evento IS 'Evento al que fue invitado';
COMMENT ON COLUMN public.invitados.id_rrpp IS 'RRPP que agregó al invitado';
COMMENT ON COLUMN public.invitados.ingresado IS 'Estado de ingreso (marcado por seguridad)';
COMMENT ON COLUMN public.invitados.fecha_ingreso IS 'Fecha y hora en que ingresó';

-- Enable RLS
ALTER TABLE public.invitados ENABLE ROW LEVEL SECURITY;
