-- =============================================
-- Migration: 011 - Add Profile Image to Invitados
-- Description: Add profile_image_url column for VIP guests
-- =============================================

-- Add profile_image_url column to invitados table
ALTER TABLE invitados
ADD COLUMN profile_image_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN invitados.profile_image_url IS 'URL of profile image for VIP guests (required for VIP lotes)';
