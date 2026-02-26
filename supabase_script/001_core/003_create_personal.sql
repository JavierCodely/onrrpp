-- =============================================
-- Migration: 003 - Create Personal Table
-- Description: Personal table integrated with Supabase Auth
-- Dependencies: 001_create_enums.sql, 002_create_clubs.sql
-- Version: 1.0 (Original)
-- =============================================

-- Create personal table
CREATE TABLE public.personal (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    edad INTEGER,
    sexo sexo_type NOT NULL,
    ubicacion TEXT,
    rol user_role NOT NULL,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT edad_valida CHECK (edad IS NULL OR (edad >= 18 AND edad <= 100))
);

-- Create indexes
CREATE INDEX idx_personal_uuid_club ON public.personal(uuid_club);
CREATE INDEX idx_personal_rol ON public.personal(rol);
CREATE INDEX idx_personal_activo ON public.personal(activo);
CREATE INDEX idx_personal_club_rol ON public.personal(uuid_club, rol);

-- Add comments
COMMENT ON TABLE public.personal IS 'Personal de cada club - Integrado con Supabase Auth';
COMMENT ON COLUMN public.personal.id IS 'ID del usuario en auth.users';
COMMENT ON COLUMN public.personal.sexo IS 'Sexo del personal: hombre o mujer';
COMMENT ON COLUMN public.personal.rol IS 'Rol del usuario: admin, rrpp o seguridad';
COMMENT ON COLUMN public.personal.uuid_club IS 'Club al que pertenece el personal';
COMMENT ON COLUMN public.personal.activo IS 'Estado del personal (activo/inactivo)';

-- Enable RLS
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
