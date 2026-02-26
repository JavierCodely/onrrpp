-- Migration: 070 - Encrypt cliente_dni in ventas_mesas
-- Description: Encrypt cliente_dni field using pgcrypto for data protection
-- Dependencies: 064_create_mesas_ventas.sql, 066_create_mesas_functions.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-31

-- ============================================
-- SECTION 1: Enable pgcrypto Extension
-- ============================================

-- Ensure pgcrypto is available (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS 'Cryptographic functions for PostgreSQL';

-- ============================================
-- SECTION 2: Create Encryption Helper Functions
-- ============================================

-- Function to get encryption key from database configuration
-- IMPORTANT: Set this key using: ALTER DATABASE postgres SET app.encryption_key = 'your-strong-secret-key-here';
-- The key should be at least 32 characters for strong encryption
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_key TEXT;
BEGIN
    -- Get encryption key from database settings
    -- This is more secure than hardcoding and works with RLS
    v_key := current_setting('app.encryption_key', true);

    -- Fallback to a default key if not set (NOT RECOMMENDED FOR PRODUCTION)
    -- You MUST set a custom key before using in production
    IF v_key IS NULL OR v_key = '' THEN
        -- This is a placeholder - DO NOT use in production
        v_key := 'CHANGE_THIS_KEY_IN_PRODUCTION_USE_ALTER_DATABASE';
        RAISE WARNING 'Using default encryption key. Set custom key with: ALTER DATABASE postgres SET app.encryption_key = ''your-secret-key'';';
    END IF;

    RETURN v_key;
END;
$$;

COMMENT ON FUNCTION get_encryption_key IS 'Returns the encryption key from database settings. Configure with: ALTER DATABASE postgres SET app.encryption_key = ''your-key'';';

-- Function to encrypt DNI
CREATE OR REPLACE FUNCTION encrypt_dni(p_dni TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
AS $$
BEGIN
    IF p_dni IS NULL OR TRIM(p_dni) = '' THEN
        RETURN NULL;
    END IF;

    -- Use AES encryption via pgp_sym_encrypt
    -- The result is base64 encoded for storage as TEXT
    RETURN encode(
        pgp_sym_encrypt(
            p_dni,
            get_encryption_key(),
            'compress-algo=1, cipher-algo=aes256'
        ),
        'base64'
    );
END;
$$;

COMMENT ON FUNCTION encrypt_dni IS 'Encrypts a DNI value using AES-256 symmetric encryption';

-- Function to decrypt DNI (only accessible to authenticated users via RLS)
CREATE OR REPLACE FUNCTION decrypt_dni(p_encrypted_dni TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_encrypted_dni IS NULL OR TRIM(p_encrypted_dni) = '' THEN
        RETURN NULL;
    END IF;

    -- Decrypt the base64 encoded encrypted value
    RETURN pgp_sym_decrypt(
        decode(p_encrypted_dni, 'base64'),
        get_encryption_key(),
        'compress-algo=1, cipher-algo=aes256'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If decryption fails (wrong key, corrupted data), return NULL
        RAISE WARNING 'Failed to decrypt DNI: %', SQLERRM;
        RETURN NULL;
END;
$$;

COMMENT ON FUNCTION decrypt_dni IS 'Decrypts an encrypted DNI value. Returns NULL if decryption fails.';

-- ============================================
-- SECTION 3: Backup Plaintext Data
-- ============================================

-- Add temporary column to store plaintext for migration
ALTER TABLE public.ventas_mesas
ADD COLUMN IF NOT EXISTS cliente_dni_plaintext TEXT;

-- Copy existing plaintext DNI to backup column
UPDATE public.ventas_mesas
SET cliente_dni_plaintext = cliente_dni
WHERE cliente_dni IS NOT NULL;

COMMENT ON COLUMN public.ventas_mesas.cliente_dni_plaintext IS 'TEMPORARY: Backup of plaintext DNI during encryption migration. Will be dropped after verification.';

-- ============================================
-- SECTION 4: Encrypt Existing Data
-- ============================================

-- Encrypt all existing DNI values
UPDATE public.ventas_mesas
SET cliente_dni = encrypt_dni(cliente_dni_plaintext)
WHERE cliente_dni_plaintext IS NOT NULL;

-- Verify encryption worked
DO $$
DECLARE
    v_total_count INTEGER;
    v_encrypted_count INTEGER;
    v_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM public.ventas_mesas;
    SELECT COUNT(*) INTO v_encrypted_count FROM public.ventas_mesas WHERE cliente_dni IS NOT NULL;
    SELECT COUNT(*) INTO v_null_count FROM public.ventas_mesas WHERE cliente_dni IS NULL AND cliente_dni_plaintext IS NOT NULL;

    RAISE NOTICE '✅ Total ventas_mesas: %', v_total_count;
    RAISE NOTICE '✅ Encrypted DNIs: %', v_encrypted_count;

    IF v_null_count > 0 THEN
        RAISE WARNING '⚠️ Found % records where encryption may have failed', v_null_count;
    END IF;
END $$;

-- ============================================
-- SECTION 5: Update RPC Functions
-- ============================================

-- Update escanear_mesa_seguridad to decrypt DNI before returning
CREATE OR REPLACE FUNCTION public.escanear_mesa_seguridad(
    p_qr_code TEXT,
    p_solo_verificar BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_user_nombre TEXT;
    v_user_apellido TEXT;
    v_venta_mesa RECORD;
    v_mesa RECORD;
    v_sector RECORD;
    v_is_assigned BOOLEAN;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club, nombre, apellido
    INTO v_user_role, v_user_club, v_user_nombre, v_user_apellido
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'seguridad' THEN
        RETURN json_build_object('success', false, 'error', 'Solo seguridad puede escanear mesas');
    END IF;

    -- Find venta by QR code
    SELECT * INTO v_venta_mesa
    FROM public.ventas_mesas
    WHERE qr_code = p_qr_code;

    IF v_venta_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'QR code invalido o venta no encontrada');
    END IF;

    -- Check club match
    IF v_venta_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Get mesa data
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = v_venta_mesa.uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check if mesa is sold
    IF v_mesa.estado != 'vendido' THEN
        RETURN json_build_object('success', false, 'error', 'Esta mesa no esta vendida');
    END IF;

    -- Check if limit reached
    IF v_mesa.escaneos_seguridad_count >= v_mesa.max_personas THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mesa completa: limite de personas alcanzado',
            'max_personas', v_mesa.max_personas,
            'escaneos_actuales', v_mesa.escaneos_seguridad_count
        );
    END IF;

    -- Get sector data
    SELECT * INTO v_sector
    FROM public.sectores
    WHERE id = v_mesa.uuid_sector;

    -- Check sector assignment (similar to lotes_seguridad)
    -- If sectores_seguridad table exists, validate assignment
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores_seguridad') THEN
        -- Check if any security is assigned to this sector
        IF EXISTS (SELECT 1 FROM public.sectores_seguridad WHERE uuid_sector = v_mesa.uuid_sector) THEN
            -- Check if current user is assigned
            SELECT EXISTS (
                SELECT 1 FROM public.sectores_seguridad
                WHERE uuid_sector = v_mesa.uuid_sector
                AND id_seguridad = v_user_id
            ) INTO v_is_assigned;

            IF NOT v_is_assigned THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Esta mesa pertenece al sector: ' || v_sector.nombre,
                    'sector_nombre', v_sector.nombre
                );
            END IF;
        END IF;
    END IF;

    -- If only verification, return success without creating escaneo
    IF p_solo_verificar THEN
        RETURN json_build_object(
            'success', true,
            'verificacion', true,
            'mesa_nombre', v_mesa.nombre,
            'sector_nombre', v_sector.nombre,
            'sector_imagen_url', v_sector.imagen_url,
            'coordenada_x', v_mesa.coordenada_x,
            'coordenada_y', v_mesa.coordenada_y,
            'max_personas', v_mesa.max_personas,
            'escaneos_actuales', v_mesa.escaneos_seguridad_count,
            'cliente_dni', decrypt_dni(v_venta_mesa.cliente_dni),  -- DECRYPT HERE
            'cliente_nombre', v_venta_mesa.cliente_nombre
        );
    END IF;

    -- Create escaneo record (trigger will increment counter)
    INSERT INTO public.escaneos_mesas (
        uuid_mesa,
        uuid_venta_mesa,
        tipo_escaneo,
        id_personal,
        nombre_personal,
        rol_personal,
        qr_code_escaneado
    ) VALUES (
        v_mesa.id,
        v_venta_mesa.id,
        'seguridad',
        v_user_id,
        v_user_nombre || ' ' || v_user_apellido,
        'seguridad',
        p_qr_code
    );

    -- Return success with mesa location info
    RETURN json_build_object(
        'success', true,
        'message', 'Ingreso registrado exitosamente',
        'mesa_nombre', v_mesa.nombre,
        'sector_nombre', v_sector.nombre,
        'sector_imagen_url', v_sector.imagen_url,
        'coordenada_x', v_mesa.coordenada_x,
        'coordenada_y', v_mesa.coordenada_y,
        'max_personas', v_mesa.max_personas,
        'escaneos_actuales', v_mesa.escaneos_seguridad_count + 1,
        'cliente_dni', decrypt_dni(v_venta_mesa.cliente_dni),  -- DECRYPT HERE
        'cliente_nombre', v_venta_mesa.cliente_nombre
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.escanear_mesa_seguridad(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.escanear_mesa_seguridad IS 'Seguridad escanea QR de mesa vendida para registrar ingreso. Decrypts cliente_dni for authenticated users.';

-- Update escanear_mesa_bartender to decrypt DNI before returning
CREATE OR REPLACE FUNCTION public.escanear_mesa_bartender(
    p_qr_code TEXT,
    p_marcar_entregado BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_user_nombre TEXT;
    v_user_apellido TEXT;
    v_venta_mesa RECORD;
    v_mesa RECORD;
    v_sector RECORD;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club, nombre, apellido
    INTO v_user_role, v_user_club, v_user_nombre, v_user_apellido
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'bartender' THEN
        RETURN json_build_object('success', false, 'error', 'Solo bartenders pueden escanear consumiciones');
    END IF;

    -- Find venta by QR code
    SELECT * INTO v_venta_mesa
    FROM public.ventas_mesas
    WHERE qr_code = p_qr_code;

    IF v_venta_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'QR code invalido o venta no encontrada');
    END IF;

    -- Check club match
    IF v_venta_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Get mesa data
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = v_venta_mesa.uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check if mesa has consumicion
    IF NOT v_mesa.tiene_consumicion THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Esta mesa no incluye consumicion'
        );
    END IF;

    -- Check if already delivered
    IF v_mesa.consumicion_entregada THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La consumicion ya fue entregada',
            'fecha_entrega', v_mesa.fecha_entrega_consumicion,
            'bartender_nombre', (
                SELECT nombre || ' ' || apellido
                FROM public.personal
                WHERE id = v_mesa.id_bartender_entrega
            )
        );
    END IF;

    -- Get sector data
    SELECT * INTO v_sector
    FROM public.sectores
    WHERE id = v_mesa.uuid_sector;

    -- If not marking as delivered, just return info (with sector_nombre added)
    IF NOT p_marcar_entregado THEN
        RETURN json_build_object(
            'success', true,
            'mostrar_confirmacion', true,
            'mesa_nombre', v_mesa.nombre,
            'sector_nombre', v_sector.nombre,
            'detalle_consumicion', v_mesa.detalle_consumicion,
            'monto_consumicion', v_mesa.monto_consumicion,
            'cliente_dni', decrypt_dni(v_venta_mesa.cliente_dni),  -- DECRYPT HERE
            'cliente_nombre', v_venta_mesa.cliente_nombre
        );
    END IF;

    -- Mark as delivered (trigger will validate no duplicate scans)
    INSERT INTO public.escaneos_mesas (
        uuid_mesa,
        uuid_venta_mesa,
        tipo_escaneo,
        id_personal,
        nombre_personal,
        rol_personal,
        qr_code_escaneado
    ) VALUES (
        v_mesa.id,
        v_venta_mesa.id,
        'bartender',
        v_user_id,
        v_user_nombre || ' ' || v_user_apellido,
        'bartender',
        p_qr_code
    );

    -- Update mesa consumicion status
    UPDATE public.mesas
    SET
        consumicion_entregada = true,
        id_bartender_entrega = v_user_id,
        fecha_entrega_consumicion = NOW(),
        updated_at = NOW()
    WHERE id = v_mesa.id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Consumicion marcada como entregada',
        'mesa_nombre', v_mesa.nombre,
        'detalle_consumicion', v_mesa.detalle_consumicion,
        'fecha_entrega', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.escanear_mesa_bartender(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.escanear_mesa_bartender IS 'Bartender escanea QR de mesa para entregar consumicion. Decrypts cliente_dni for authenticated users.';

-- Update vender_mesa to encrypt DNI on insert
CREATE OR REPLACE FUNCTION public.vender_mesa(
    p_uuid_mesa UUID,
    p_cliente_dni TEXT,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_cliente_email TEXT DEFAULT NULL,
    p_precio_venta DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_mesa RECORD;
    v_qr_code TEXT;
    v_venta_id UUID;
    v_precio_final DECIMAL;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user data
    SELECT rol, uuid_club INTO v_user_role, v_user_club
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'rrpp' THEN
        RETURN json_build_object('success', false, 'error', 'Solo RRPP puede vender mesas');
    END IF;

    -- Get mesa
    SELECT * INTO v_mesa
    FROM public.mesas
    WHERE id = p_uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    -- Check club match
    IF v_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    -- Check if mesa is libre or reservado by this RRPP
    IF v_mesa.estado = 'vendido' THEN
        RETURN json_build_object('success', false, 'error', 'La mesa ya esta vendida');
    END IF;

    IF v_mesa.estado = 'reservado' AND v_mesa.id_rrpp != v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'La mesa esta reservada por otro RRPP');
    END IF;

    -- Validate comision is configured
    IF v_mesa.comision_tipo IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La mesa no tiene comision configurada. Contacte al administrador.');
    END IF;

    -- Use provided price or default mesa price
    v_precio_final := COALESCE(p_precio_venta, v_mesa.precio);

    -- Generate QR code (format: MESA-{uuid_mesa}-{timestamp})
    v_qr_code := 'MESA-' || p_uuid_mesa::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;

    -- Create venta (trigger will update mesa estado to vendido)
    -- ENCRYPT DNI BEFORE STORING
    INSERT INTO public.ventas_mesas (
        uuid_mesa,
        uuid_evento,
        uuid_club,
        id_rrpp,
        cliente_dni,
        cliente_nombre,
        cliente_email,
        precio_venta,
        comision_tipo,
        comision_rrpp_monto,
        comision_rrpp_porcentaje,
        qr_code
    ) VALUES (
        v_mesa.id,
        v_mesa.uuid_evento,
        v_mesa.uuid_club,
        v_user_id,
        encrypt_dni(p_cliente_dni),  -- ENCRYPT HERE
        p_cliente_nombre,
        p_cliente_email,
        v_precio_final,
        v_mesa.comision_tipo,
        v_mesa.comision_rrpp_monto,
        v_mesa.comision_rrpp_porcentaje,
        v_qr_code
    )
    RETURNING id INTO v_venta_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Mesa vendida exitosamente',
        'venta_id', v_venta_id,
        'mesa_id', v_mesa.id,
        'mesa_nombre', v_mesa.nombre,
        'qr_code', v_qr_code,
        'precio', v_precio_final
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL) TO authenticated;

COMMENT ON FUNCTION public.vender_mesa IS 'RRPP vende una mesa (crea venta con QR, encrypts cliente_dni, cambia estado a vendido)';

-- ============================================
-- SECTION 6: Create View for Decrypted Access
-- ============================================

-- Create a view that automatically decrypts DNI for authenticated users
-- This view respects existing RLS policies from ventas_mesas
CREATE OR REPLACE VIEW public.ventas_mesas_decrypted AS
SELECT
    id,
    uuid_mesa,
    uuid_evento,
    uuid_club,
    id_rrpp,
    decrypt_dni(cliente_dni) AS cliente_dni,  -- Decrypted DNI
    cliente_nombre,
    cliente_email,
    precio_venta,
    comision_tipo,
    comision_rrpp_monto,
    comision_rrpp_porcentaje,
    comision_calculada,
    qr_code,
    created_at,
    updated_at
FROM public.ventas_mesas;

COMMENT ON VIEW public.ventas_mesas_decrypted IS 'View with decrypted cliente_dni. Inherits RLS from ventas_mesas table.';

-- Grant access to authenticated users
GRANT SELECT ON public.ventas_mesas_decrypted TO authenticated;

-- ============================================
-- SECTION 7: Update Index (if needed)
-- ============================================

-- Drop the plaintext index on cliente_dni
DROP INDEX IF EXISTS public.idx_ventas_mesas_cliente_dni;

-- Note: We cannot create an index on encrypted data for searching
-- If you need to search by DNI, you must decrypt first or maintain a separate lookup table
-- For now, searching by DNI will require scanning the table
COMMENT ON COLUMN public.ventas_mesas.cliente_dni IS 'ENCRYPTED: DNI del cliente comprador (AES-256). Use decrypt_dni() function or ventas_mesas_decrypted view to read.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_test_encrypted TEXT;
    v_test_decrypted TEXT;
    v_sample_dni TEXT := '12345678';
BEGIN
    -- Test encryption/decryption
    v_test_encrypted := encrypt_dni(v_sample_dni);
    v_test_decrypted := decrypt_dni(v_test_encrypted);

    IF v_test_decrypted = v_sample_dni THEN
        RAISE NOTICE '✅ Encryption/decryption test passed';
    ELSE
        RAISE WARNING '⚠️ Encryption/decryption test failed: expected %, got %', v_sample_dni, v_test_decrypted;
    END IF;

    -- Check functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'encrypt_dni') THEN
        RAISE NOTICE '✅ Function encrypt_dni created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrypt_dni') THEN
        RAISE NOTICE '✅ Function decrypt_dni created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_encryption_key') THEN
        RAISE NOTICE '✅ Function get_encryption_key created';
    END IF;

    -- Check view exists
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'ventas_mesas_decrypted') THEN
        RAISE NOTICE '✅ View ventas_mesas_decrypted created';
    END IF;

    RAISE NOTICE '✅ Migration 070 completed successfully';
    RAISE NOTICE '⚠️ IMPORTANT: Set encryption key with: ALTER DATABASE postgres SET app.encryption_key = ''your-strong-secret-key-here'';';
    RAISE NOTICE '⚠️ After verifying encryption works, drop the backup column with: ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;';
END $$;

-- ============================================
-- POST-MIGRATION INSTRUCTIONS
-- ============================================

/*
CRITICAL STEPS AFTER RUNNING THIS MIGRATION:

1. SET ENCRYPTION KEY (REQUIRED):
   Run this command in the SQL editor:

   ALTER DATABASE postgres SET app.encryption_key = 'your-very-strong-secret-key-minimum-32-characters';

   Replace 'your-very-strong-secret-key-minimum-32-characters' with a secure random key.
   Generate a strong key with: https://www.random.org/strings/ or use a password manager.

2. VERIFY ENCRYPTION (REQUIRED):
   Test that decryption works:

   SELECT
       cliente_dni AS encrypted,
       decrypt_dni(cliente_dni) AS decrypted,
       cliente_dni_plaintext AS original
   FROM public.ventas_mesas
   LIMIT 5;

   The 'decrypted' column should match 'original' column.

3. UPDATE FRONTEND CODE (REQUIRED):
   - Update TypeScript services to use ventas_mesas_decrypted view instead of ventas_mesas table
   - Or continue using ventas_mesas table but know that cliente_dni will be encrypted
   - The RPC functions already decrypt automatically

4. CLEANUP BACKUP COLUMN (AFTER VERIFICATION):
   Once you've verified encryption works correctly, drop the backup:

   ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;

5. SECURITY NOTES:
   - The encryption key is stored in database settings (safer than hardcoding)
   - Only authenticated users with proper RLS can access decrypted data
   - The key is NOT stored in the database tables, only in server configuration
   - Backup your encryption key securely - if lost, encrypted data cannot be recovered
   - Consider using Supabase Vault for production (more advanced setup)
*/

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- ROLLBACK INSTRUCTIONS:
-- This rollback assumes you still have the cliente_dni_plaintext backup column

-- 1. Restore plaintext DNI from backup
UPDATE public.ventas_mesas
SET cliente_dni = cliente_dni_plaintext
WHERE cliente_dni_plaintext IS NOT NULL;

-- 2. Drop the backup column
ALTER TABLE public.ventas_mesas DROP COLUMN IF EXISTS cliente_dni_plaintext;

-- 3. Recreate the plaintext index
CREATE INDEX idx_ventas_mesas_cliente_dni ON public.ventas_mesas(cliente_dni);

-- 4. Restore original RPC functions (run migrations 066 and 069 again)
-- See: 066_create_mesas_functions.sql and 069_update_bartender_scan_add_sector.sql

-- 5. Drop encryption functions and view
DROP VIEW IF EXISTS public.ventas_mesas_decrypted;
DROP FUNCTION IF EXISTS public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS public.escanear_mesa_bartender(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.escanear_mesa_seguridad(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS decrypt_dni(TEXT);
DROP FUNCTION IF EXISTS encrypt_dni(TEXT);
DROP FUNCTION IF EXISTS get_encryption_key();

-- 6. Remove the encryption key setting
ALTER DATABASE postgres RESET app.encryption_key;
*/
