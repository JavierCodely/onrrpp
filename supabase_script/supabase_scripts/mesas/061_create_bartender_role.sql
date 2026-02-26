-- Migration: 061 - Add Bartender Role to user_role Enum
-- Description: Extends user_role enum to include 'bartender' for managing table consumiciones
-- Dependencies: 001_create_enums.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Extend user_role Enum
-- ============================================

-- Add 'bartender' to the existing user_role enum
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE inside a transaction block
-- This must be run separately or the transaction must be committed first

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bartender';

-- Update comment
COMMENT ON TYPE user_role IS 'Roles disponibles en la plataforma: admin (crea eventos), rrpp (gestiona invitados), seguridad (valida ingreso), bartender (entrega consumiciones)';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the new enum value exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'bartender'
        AND enumtypid = 'user_role'::regtype
    ) THEN
        RAISE NOTICE '✅ Migration 061 successful: bartender role added to user_role enum';
    ELSE
        RAISE EXCEPTION '❌ Migration 061 failed: bartender role not found in user_role enum';
    END IF;
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Note: PostgreSQL does not support removing enum values directly
-- To rollback, you would need to:
-- 1. Create a new enum without 'bartender'
-- 2. Alter all columns using user_role to use the new enum
-- 3. Drop the old enum
-- 4. Rename the new enum to user_role

-- This is a complex operation and should be done with caution
-- It's recommended to test in a development environment first

-- Example rollback (DO NOT RUN unless you know what you're doing):
-- CREATE TYPE user_role_new AS ENUM ('admin', 'rrpp', 'seguridad');
-- ALTER TABLE public.personal ALTER COLUMN rol TYPE user_role_new USING rol::text::user_role_new;
-- DROP TYPE user_role;
-- ALTER TYPE user_role_new RENAME TO user_role;
*/
