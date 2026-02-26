-- =============================================
-- Migration: 001 - Create Enums
-- Description: Create enum types for roles and sex
-- Dependencies: None
-- Version: 1.0 (Original)
-- =============================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'rrpp', 'seguridad');

-- Create enum for sex
CREATE TYPE sexo_type AS ENUM ('hombre', 'mujer');

-- Add comment
COMMENT ON TYPE user_role IS 'Roles disponibles en la plataforma: admin (crea eventos), rrpp (gestiona invitados), seguridad (valida ingreso)';
COMMENT ON TYPE sexo_type IS 'Opciones de sexo: hombre o mujer';
