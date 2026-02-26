-- Migration: 062 - Create Sectores Table and Storage
-- Description: Physical areas (sectors) within the club with visual layouts
-- Dependencies: 004_create_eventos.sql, 010_create_storage_buckets.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Storage Bucket for Sector Images
-- ============================================

-- Create storage bucket for sector layout images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sectores-imagenes', 'sectores-imagenes', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 2: Table Creation
-- ============================================

CREATE TABLE IF NOT EXISTS public.sectores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    imagen_url TEXT,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    uuid_club UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0)
);

-- Create indexes
CREATE INDEX idx_sectores_uuid_evento ON public.sectores(uuid_evento);
CREATE INDEX idx_sectores_uuid_club ON public.sectores(uuid_club);
CREATE INDEX idx_sectores_activo ON public.sectores(activo);

-- Add comments
COMMENT ON TABLE public.sectores IS 'Sectores o areas fisicas del club (VIP, Terraza, Salon Principal, etc.)';
COMMENT ON COLUMN public.sectores.nombre IS 'Nombre del sector (ej: VIP Principal, Terraza)';
COMMENT ON COLUMN public.sectores.imagen_url IS 'URL de la imagen del plano del sector en storage';
COMMENT ON COLUMN public.sectores.uuid_evento IS 'Evento al que pertenece el sector';
COMMENT ON COLUMN public.sectores.uuid_club IS 'Club al que pertenece el sector (para multi-tenant)';

-- ============================================
-- SECTION 3: Trigger for updated_at
-- ============================================

CREATE TRIGGER trigger_sectores_updated_at
    BEFORE UPDATE ON public.sectores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SECTION 4: RLS Policies
-- ============================================

ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view sectores from their club
CREATE POLICY "Users can view sectores from their club"
ON public.sectores
FOR SELECT
USING (uuid_club = public.get_current_user_club());

-- INSERT: Only admins can create sectores
CREATE POLICY "Admins can create sectores"
ON public.sectores
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- UPDATE: Only admins can update sectores
CREATE POLICY "Admins can update sectores"
ON public.sectores
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- DELETE: Only admins can delete sectores
CREATE POLICY "Admins can delete sectores"
ON public.sectores
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_club = public.get_current_user_club()
);

-- ============================================
-- SECTION 5: Storage Policies
-- ============================================

-- Policy: Admins can upload sector images to their club's folder
CREATE POLICY "Admins can upload sector images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'sectores-imagenes'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can update their club's sector images
CREATE POLICY "Admins can update sector images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'sectores-imagenes'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
)
WITH CHECK (
    bucket_id = 'sectores-imagenes'
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can delete their club's sector images
CREATE POLICY "Admins can delete sector images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'sectores-imagenes'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Everyone can view sector images (public bucket)
CREATE POLICY "Anyone can view sector images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sectores-imagenes');

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores') THEN
        RAISE NOTICE '✅ Table sectores created successfully';
    END IF;

    -- Check RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sectores' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS enabled on sectores';
    END IF;

    -- Check policies exist
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sectores') >= 4 THEN
        RAISE NOTICE '✅ RLS policies created for sectores';
    END IF;

    -- Check storage bucket exists
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sectores-imagenes') THEN
        RAISE NOTICE '✅ Storage bucket sectores-imagenes created';
    END IF;

    RAISE NOTICE '✅ Migration 062 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop storage policies
DROP POLICY IF EXISTS "Admins can upload sector images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update sector images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete sector images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view sector images" ON storage.objects;

-- Delete storage bucket
DELETE FROM storage.buckets WHERE id = 'sectores-imagenes';

-- Drop table (will cascade to mesas)
DROP TABLE IF EXISTS public.sectores CASCADE;
*/
