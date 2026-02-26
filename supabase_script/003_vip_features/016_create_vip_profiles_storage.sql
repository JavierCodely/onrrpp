-- =============================================
-- Migration: 016 - Create VIP Profiles Storage Bucket
-- Description: Configure Supabase Storage for VIP guest profile images
-- Dependencies: 006_create_functions.sql, 015_add_profile_image_to_invitados.sql
-- Version: 1.0 (Consolidated from 012_create_vip_profiles_storage.sql)
-- =============================================

-- Create storage bucket for VIP profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vip-profiles', 'vip-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES FOR vip-profiles
-- ========================================

-- Policy: RRPP can upload VIP profile images to their club's folder
CREATE POLICY "RRPP can upload VIP profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('rrpp'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: RRPP can update VIP profile images in their club's folder
CREATE POLICY "RRPP can update VIP profile images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('rrpp'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
)
WITH CHECK (
    bucket_id = 'vip-profiles'
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: RRPP can delete VIP profile images in their club's folder
CREATE POLICY "RRPP can delete VIP profile images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('rrpp'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Everyone can view VIP profile images (public bucket)
CREATE POLICY "Anyone can view VIP profile images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vip-profiles');

-- Add comment
COMMENT ON COLUMN public.invitados.profile_image_url IS 'URL del storage bucket vip-profiles - requerido para invitados VIP';
