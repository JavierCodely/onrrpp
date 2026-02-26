-- =============================================
-- Migration: 010 - Create Storage Buckets
-- Description: Configure Supabase Storage for event banners
-- =============================================

-- Create storage bucket for event banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES FOR event-banners
-- ========================================
-- Note: storage.objects already has RLS enabled by default in Supabase

-- Policy: Admins can upload banners to their club's folder
CREATE POLICY "Admins can upload event banners"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'event-banners'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can update their club's banners
CREATE POLICY "Admins can update event banners"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'event-banners'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
)
WITH CHECK (
    bucket_id = 'event-banners'
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can delete their club's banners
CREATE POLICY "Admins can delete event banners"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'event-banners'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Everyone can view banners (public bucket)
CREATE POLICY "Anyone can view event banners"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-banners');
