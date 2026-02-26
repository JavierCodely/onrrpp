-- =============================================
-- Migration: 002 - Create Clubs Table
-- Description: Table for clubs (multi-tenant base)
-- =============================================

-- Create clubs table
CREATE TABLE public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_clubs_activo ON public.clubs(activo);
CREATE INDEX idx_clubs_nombre ON public.clubs(nombre);

-- Add comments
COMMENT ON TABLE public.clubs IS 'Clubs - Base para multi-tenant, cada club es independiente';
COMMENT ON COLUMN public.clubs.id IS 'Identificador único del club';
COMMENT ON COLUMN public.clubs.nombre IS 'Nombre del club';
COMMENT ON COLUMN public.clubs.activo IS 'Estado del club (activo/inactivo)';

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
