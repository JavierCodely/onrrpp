-- =============================================
-- Migration: 012 - Create Storage Bucket for VIP Profiles
-- Description: Configure Supabase Storage for VIP guest profile images
-- =============================================

-- Create storage bucket for VIP profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vip-profiles', 'vip-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES FOR vip-profiles
-- ========================================
-- Note: storage.objects already has RLS enabled by default in Supabase

-- Policy: RRPPs can upload VIP profile images to their club's folder
CREATE POLICY "RRPPs can upload VIP profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('rrpp'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: RRPPs can update their club's VIP profile images
CREATE POLICY "RRPPs can update VIP profile images"
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

-- Policy: RRPPs can delete their club's VIP profile images
CREATE POLICY "RRPPs can delete VIP profile images"
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

-- Policy: Admins can also upload VIP profile images to their club's folder
CREATE POLICY "Admins can upload VIP profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can update their club's VIP profile images
CREATE POLICY "Admins can update VIP profile images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
)
WITH CHECK (
    bucket_id = 'vip-profiles'
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);

-- Policy: Admins can delete their club's VIP profile images
CREATE POLICY "Admins can delete VIP profile images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'vip-profiles'
    AND public.check_user_has_role('admin'::user_role)
    AND (storage.foldername(name))[1] = public.get_current_user_club()::text
);
