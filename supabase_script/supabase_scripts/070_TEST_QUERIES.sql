-- Test Queries for Migration 070: Cliente DNI Encryption
-- Run these queries AFTER executing 070_encrypt_cliente_dni.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-31

-- ============================================
-- SECTION 1: Verify Functions Exist
-- ============================================

-- Check that all encryption functions were created
SELECT
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_encryption_key',
    'encrypt_dni',
    'decrypt_dni'
)
ORDER BY routine_name;

-- Expected: 3 functions (all SECURITY DEFINER)

-- ============================================
-- SECTION 2: Test Encryption/Decryption
-- ============================================

-- Test basic encryption and decryption
SELECT
    'Test DNI 12345678' AS test_case,
    encrypt_dni('12345678') AS encrypted,
    decrypt_dni(encrypt_dni('12345678')) AS decrypted,
    decrypt_dni(encrypt_dni('12345678')) = '12345678' AS test_passed;

-- Expected: test_passed = true, encrypted should be long base64 string

-- Test with different DNI values
SELECT
    dni AS original,
    encrypt_dni(dni) AS encrypted,
    decrypt_dni(encrypt_dni(dni)) AS decrypted,
    decrypt_dni(encrypt_dni(dni)) = dni AS matches
FROM (
    VALUES
        ('12345678'),
        ('87654321'),
        ('11111111'),
        ('99999999')
) AS test_dnis(dni);

-- Expected: All 'matches' = true

-- Test NULL handling
SELECT
    NULL AS original,
    encrypt_dni(NULL) AS encrypted,
    decrypt_dni(NULL) AS decrypted,
    encrypt_dni(NULL) IS NULL AS null_encrypted,
    decrypt_dni(NULL) IS NULL AS null_decrypted;

-- Expected: null_encrypted = true, null_decrypted = true

-- Test empty string handling
SELECT
    '' AS original,
    encrypt_dni('') AS encrypted,
    decrypt_dni(encrypt_dni('')) AS decrypted;

-- Expected: encrypted = NULL (empty strings are treated as NULL)

-- ============================================
-- SECTION 3: Verify Data Migration
-- ============================================

-- Check if backup column exists and has data
SELECT
    COUNT(*) AS total_ventas,
    COUNT(cliente_dni) AS encrypted_count,
    COUNT(cliente_dni_plaintext) AS backup_count
FROM public.ventas_mesas;

-- Expected: encrypted_count = backup_count (all migrated)

-- Verify encryption worked correctly by comparing plaintext backup with decrypted
SELECT
    id,
    cliente_dni_plaintext AS original,
    cliente_dni AS encrypted_value,
    decrypt_dni(cliente_dni) AS decrypted_value,
    cliente_dni_plaintext = decrypt_dni(cliente_dni) AS match
FROM public.ventas_mesas
WHERE cliente_dni_plaintext IS NOT NULL
LIMIT 10;

-- Expected: All 'match' = true

-- Check for any records where decryption failed
SELECT
    id,
    cliente_dni_plaintext AS original,
    decrypt_dni(cliente_dni) AS decrypted,
    'MISMATCH' AS status
FROM public.ventas_mesas
WHERE cliente_dni_plaintext IS NOT NULL
AND cliente_dni_plaintext != decrypt_dni(cliente_dni);

-- Expected: 0 rows (no mismatches)

-- ============================================
-- SECTION 4: Test the Decrypted View
-- ============================================

-- Check that the view exists
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'ventas_mesas_decrypted';

-- Expected: 1 row with table_type = 'VIEW'

-- Query the decrypted view
SELECT
    id,
    cliente_dni AS decrypted_dni,
    cliente_nombre,
    precio_venta,
    created_at
FROM public.ventas_mesas_decrypted
LIMIT 5;

-- Expected: cliente_dni should be plaintext (not encrypted base64)

-- Compare view output with direct table query
SELECT
    v.id,
    v.cliente_dni AS from_view,
    decrypt_dni(t.cliente_dni) AS from_table_decrypted,
    v.cliente_dni = decrypt_dni(t.cliente_dni) AS match
FROM public.ventas_mesas_decrypted v
JOIN public.ventas_mesas t ON v.id = t.id
LIMIT 10;

-- Expected: All 'match' = true

-- ============================================
-- SECTION 5: Test RPC Functions
-- ============================================

-- Note: These tests require actual data (venta with QR code)
-- Replace 'YOUR-QR-CODE' with an actual QR code from ventas_mesas

-- Test escanear_mesa_seguridad (verification mode)
-- Must be run as a 'seguridad' role user
/*
SELECT escanear_mesa_seguridad('YOUR-QR-CODE', true);
*/
-- Expected: JSON with 'cliente_dni' field containing DECRYPTED value

-- Test escanear_mesa_bartender (verification mode)
-- Must be run as a 'bartender' role user
/*
SELECT escanear_mesa_bartender('YOUR-QR-CODE', false);
*/
-- Expected: JSON with 'cliente_dni' field containing DECRYPTED value

-- ============================================
-- SECTION 6: Verify RLS Still Works
-- ============================================

-- Check that RLS is enabled on ventas_mesas
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'ventas_mesas';

-- Expected: rowsecurity = true

-- Check policies exist
SELECT
    policyname,
    tablename,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'ventas_mesas'
ORDER BY cmd, policyname;

-- Expected: Multiple policies (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- SECTION 7: Performance Tests
-- ============================================

-- Test encryption performance (should be fast)
EXPLAIN ANALYZE
SELECT encrypt_dni('12345678');

-- Expected: Execution time < 5ms

-- Test decryption performance (should be fast)
EXPLAIN ANALYZE
SELECT decrypt_dni(encrypt_dni('12345678'));

-- Expected: Execution time < 10ms

-- Test bulk decryption performance
EXPLAIN ANALYZE
SELECT
    id,
    decrypt_dni(cliente_dni) AS decrypted_dni
FROM public.ventas_mesas
LIMIT 100;

-- Expected: Execution time reasonable for your dataset size

-- ============================================
-- SECTION 8: Security Tests
-- ============================================

-- Verify encryption key is set (should NOT show the actual key for security)
SHOW app.encryption_key;

-- Expected: Shows the key value (only visible to superuser/admin)

-- Test that different plaintexts produce different ciphertexts
SELECT
    encrypt_dni('12345678') AS encrypted_1,
    encrypt_dni('12345678') AS encrypted_2,
    encrypt_dni('12345678') = encrypt_dni('12345678') AS same_ciphertext;

-- Note: With pgp_sym_encrypt, same plaintext may produce different ciphertext
-- due to random IV (Initialization Vector). This is GOOD for security.
-- Expected: same_ciphertext may be false (this is normal and secure)

-- Test that decryption works despite different ciphertext
SELECT
    decrypt_dni(encrypt_dni('12345678')) AS decrypted_1,
    decrypt_dni(encrypt_dni('12345678')) AS decrypted_2,
    decrypt_dni(encrypt_dni('12345678')) = decrypt_dni(encrypt_dni('12345678')) AS same_plaintext;

-- Expected: same_plaintext = true (decryption always gives same result)

-- ============================================
-- SECTION 9: Test vender_mesa Function
-- ============================================

-- Note: This test requires valid UUIDs and must be run as 'rrpp' role user
-- This is a DRY RUN test - do not execute if you don't want to create a real sale

/*
-- Prepare test data (replace with actual values)
DO $$
DECLARE
    v_test_mesa_id UUID;
    v_test_dni TEXT := '99999999';
    v_result JSON;
BEGIN
    -- Get a libre mesa from your club
    SELECT id INTO v_test_mesa_id
    FROM public.mesas
    WHERE estado = 'libre'
    AND uuid_club = public.get_current_user_club()
    LIMIT 1;

    IF v_test_mesa_id IS NULL THEN
        RAISE NOTICE 'No libre mesas found for testing';
        RETURN;
    END IF;

    -- Try to sell the mesa (will encrypt DNI)
    SELECT vender_mesa(
        v_test_mesa_id,
        v_test_dni,
        'Test Cliente',
        'test@example.com',
        NULL  -- use default price
    ) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify the DNI was encrypted
    IF (v_result->>'success')::boolean THEN
        -- Check the created venta
        SELECT
            id,
            cliente_dni AS encrypted,
            decrypt_dni(cliente_dni) AS decrypted,
            decrypt_dni(cliente_dni) = v_test_dni AS dni_matches
        FROM public.ventas_mesas
        WHERE id = (v_result->>'venta_id')::UUID;

        -- Expected: dni_matches = true
    END IF;
END $$;
*/

-- ============================================
-- SECTION 10: Final Verification Summary
-- ============================================

-- Comprehensive verification report
SELECT
    '✅ Migration 070 Verification Report' AS report_title,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('encrypt_dni', 'decrypt_dni', 'get_encryption_key')) AS functions_created,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'ventas_mesas_decrypted') AS views_created,
    (SELECT COUNT(*) FROM public.ventas_mesas WHERE cliente_dni IS NOT NULL) AS encrypted_records,
    (SELECT COUNT(*) FROM public.ventas_mesas WHERE cliente_dni_plaintext IS NOT NULL) AS backup_records,
    (SELECT COUNT(*) FROM public.ventas_mesas WHERE cliente_dni_plaintext IS NOT NULL AND cliente_dni_plaintext != decrypt_dni(cliente_dni)) AS decryption_failures;

-- Expected output:
-- functions_created: 3
-- views_created: 1
-- encrypted_records: [your count]
-- backup_records: [same as encrypted_records]
-- decryption_failures: 0

-- ============================================
-- CLEANUP VERIFICATION (Run AFTER testing)
-- ============================================

-- ONLY run this after confirming everything works perfectly
-- This will remove the backup column

/*
-- Final verification before cleanup
SELECT
    COUNT(*) FILTER (WHERE cliente_dni_plaintext = decrypt_dni(cliente_dni)) AS matching_records,
    COUNT(*) FILTER (WHERE cliente_dni_plaintext IS NOT NULL) AS total_records,
    COUNT(*) FILTER (WHERE cliente_dni_plaintext != decrypt_dni(cliente_dni)) AS mismatched_records
FROM public.ventas_mesas;

-- Expected: matching_records = total_records, mismatched_records = 0

-- If all tests pass, you can safely drop the backup column:
-- ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;
*/

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If decryption is failing, check the encryption key
-- SELECT current_setting('app.encryption_key', true);

-- If you need to manually re-encrypt a single record
/*
UPDATE public.ventas_mesas
SET cliente_dni = encrypt_dni(cliente_dni_plaintext)
WHERE id = 'YOUR-VENTA-ID'::UUID;
*/

-- If you need to manually decrypt for verification
/*
SELECT
    id,
    decrypt_dni(cliente_dni) AS decrypted_dni
FROM public.ventas_mesas
WHERE id = 'YOUR-VENTA-ID'::UUID;
*/
