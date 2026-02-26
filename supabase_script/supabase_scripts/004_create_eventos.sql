-- =============================================
-- Migration: 004 - Create Eventos Table
-- Description: Events table - Only admins can create events
-- =============================================

-- Create eventos table
CREATE TABLE public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL,
    banner_url TEXT,
    total_invitados INTEGER NOT NULL DEFAULT 0,
    total_ingresados INTEGER NOT NULL DEFAULT 0,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT total_invitados_valido CHECK (total_invitados >= 0),
    CONSTRAINT total_ingresados_valido CHECK (total_ingresados >= 0),
    CONSTRAINT ingresados_no_mayor_que_invitados CHECK (total_ingresados <= total_invitados)
);

-- Create indexes
CREATE INDEX idx_eventos_uuid_club ON public.eventos(uuid_club);
CREATE INDEX idx_eventos_estado ON public.eventos(estado);
CREATE INDEX idx_eventos_fecha ON public.eventos(fecha);
CREATE INDEX idx_eventos_created_by ON public.eventos(created_by);
CREATE INDEX idx_eventos_club_estado ON public.eventos(uuid_club, estado);

-- Add comments
COMMENT ON TABLE public.eventos IS 'Eventos del club - Solo admins pueden crear';
COMMENT ON COLUMN public.eventos.nombre IS 'Nombre del evento';
COMMENT ON COLUMN public.eventos.fecha IS 'Fecha y hora del evento';
COMMENT ON COLUMN public.eventos.banner_url IS 'URL del banner/imagen del evento (almacenado en Supabase Storage)';
COMMENT ON COLUMN public.eventos.total_invitados IS 'Contador auto-incremental del total de invitados del evento';
COMMENT ON COLUMN public.eventos.total_ingresados IS 'Contador auto-incremental de invitados que ingresaron al evento';
COMMENT ON COLUMN public.eventos.uuid_club IS 'Club al que pertenece el evento';
COMMENT ON COLUMN public.eventos.estado IS 'Estado del evento (activo/inactivo)';
COMMENT ON COLUMN public.eventos.created_by IS 'Personal (admin) que creó el evento';

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
