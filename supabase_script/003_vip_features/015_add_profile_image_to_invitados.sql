-- =============================================
-- Migration: 015 - Add Profile Image to Invitados
-- Description: Add profile_image_url column for VIP guests
-- Dependencies: 005_create_invitados.sql
-- Version: 1.0 (Consolidated from 011_add_profile_image_to_invitados.sql)
-- Note: This resolves the duplicate 011 numbering issue (was second 011)
-- =============================================

-- Add profile_image_url column to invitados table
ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.invitados.profile_image_url IS 'URL of profile image for VIP guests (required for VIP lotes)';
