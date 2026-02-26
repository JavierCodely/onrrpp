# Migration 070: Cliente DNI Encryption Guide

## Overview

This migration adds **AES-256 symmetric encryption** to the `cliente_dni` field in the `ventas_mesas` table using PostgreSQL's `pgcrypto` extension. This protects sensitive personal identification data while maintaining transparent access for authenticated users.

## What Changed

### Database Changes

1. **Encrypted Column**: `ventas_mesas.cliente_dni` now stores **encrypted** values (base64-encoded AES-256)
2. **New Functions**:
   - `get_encryption_key()` - Retrieves encryption key from database settings
   - `encrypt_dni(TEXT)` - Encrypts a DNI value
   - `decrypt_dni(TEXT)` - Decrypts an encrypted DNI value
3. **New View**: `ventas_mesas_decrypted` - Automatically decrypts DNI for SELECT queries
4. **Updated RPC Functions**: All functions that return `cliente_dni` now decrypt automatically:
   - `escanear_mesa_seguridad()`
   - `escanear_mesa_bartender()`
   - `vender_mesa()` - now encrypts DNI on insert

### Security Model

- **Encryption**: AES-256 symmetric encryption via `pgp_sym_encrypt`
- **Key Storage**: Database configuration setting (`app.encryption_key`)
- **Access Control**: RLS policies still enforce club-based isolation
- **Transparency**: Authenticated users get decrypted values automatically via RPC functions

## Step-by-Step Deployment

### 1. Execute the Migration

Run `070_encrypt_cliente_dni.sql` in the Supabase SQL Editor.

**Expected Output**:
```
✅ Encryption/decryption test passed
✅ Function encrypt_dni created
✅ Function decrypt_dni created
✅ Function get_encryption_key created
✅ View ventas_mesas_decrypted created
✅ Total ventas_mesas: X
✅ Encrypted DNIs: X
✅ Migration 070 completed successfully
⚠️ IMPORTANT: Set encryption key...
```

### 2. Set the Encryption Key (CRITICAL)

**Generate a strong key** (32+ characters recommended):
```bash
# Option 1: Use OpenSSL
openssl rand -base64 32

# Option 2: Use password generator
# Visit: https://www.random.org/strings/ or use a password manager
```

**Set the key in Supabase**:
```sql
ALTER DATABASE postgres SET app.encryption_key = 'your-very-strong-secret-key-minimum-32-characters';
```

**IMPORTANT**:
- Store this key in a **secure password manager** or secrets vault
- **Never commit** the key to version control
- If the key is lost, encrypted data **cannot be recovered**
- For production, consider using Supabase Vault (advanced)

### 3. Verify Encryption Works

Run this query to test:
```sql
SELECT
    id,
    cliente_dni AS encrypted,
    decrypt_dni(cliente_dni) AS decrypted,
    cliente_dni_plaintext AS original
FROM public.ventas_mesas
LIMIT 5;
```

**Expected result**: `decrypted` column should match `original` column exactly.

### 4. Test RPC Functions

Test that scanning functions still work:
```sql
-- Test seguridad scan (replace with real QR code)
SELECT escanear_mesa_seguridad('MESA-xxx-yyy', true);

-- Test bartender scan (replace with real QR code)
SELECT escanear_mesa_bartender('MESA-xxx-yyy', false);
```

**Expected**: JSON response should include `cliente_dni` with **decrypted** value.

### 5. Update Frontend Code (if needed)

#### Option A: Use the Decrypted View (Recommended for new code)

```typescript
// services/ventas-mesas.service.ts

// Query the decrypted view instead of table
const { data, error } = await supabase
  .from('ventas_mesas_decrypted')  // Use the view
  .select('*')
  .eq('uuid_evento', eventoId);

// cliente_dni will be automatically decrypted
console.log(data[0].cliente_dni); // "12345678" (plaintext)
```

#### Option B: Keep Using Table with Manual Decryption

```typescript
// services/ventas-mesas.service.ts

// If you query the table directly, DNI will be encrypted
const { data, error } = await supabase
  .from('ventas_mesas')
  .select('*')
  .eq('uuid_evento', eventoId);

// You'd need to call decrypt_dni() via RPC for each row
// OR just use the view (Option A is easier)
```

#### RPC Functions (No changes needed)

The RPC functions already decrypt automatically:
```typescript
// services/mesas-rpc.service.ts

// This already returns decrypted DNI
const result = await supabase.rpc('escanear_mesa_seguridad', {
  p_qr_code: qrCode,
  p_solo_verificar: true
});

console.log(result.data.cliente_dni); // "12345678" (already decrypted)
```

### 6. Cleanup Backup Column (After Verification)

Once everything works correctly:
```sql
ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;
```

**WARNING**: Only do this after confirming encryption/decryption works perfectly!

## Testing Checklist

- [ ] Migration executed successfully
- [ ] Encryption key set with `ALTER DATABASE`
- [ ] Decryption test shows matching original/decrypted values
- [ ] `escanear_mesa_seguridad()` returns decrypted DNI
- [ ] `escanear_mesa_bartender()` returns decrypted DNI
- [ ] `vender_mesa()` successfully creates new venta with encrypted DNI
- [ ] Frontend can read DNI from RPC functions
- [ ] Frontend can read DNI from `ventas_mesas_decrypted` view (if using)
- [ ] RLS policies still work (users only see their club's data)
- [ ] Backup column dropped (after all tests pass)

## Rollback Procedure

If you need to rollback (must be done **before** dropping `cliente_dni_plaintext`):

```sql
-- 1. Restore plaintext DNI
UPDATE public.ventas_mesas
SET cliente_dni = cliente_dni_plaintext
WHERE cliente_dni_plaintext IS NOT NULL;

-- 2. Drop backup column
ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;

-- 3. Recreate plaintext index
CREATE INDEX idx_ventas_mesas_cliente_dni ON public.ventas_mesas(cliente_dni);

-- 4. Drop encryption functions and view
DROP VIEW IF EXISTS public.ventas_mesas_decrypted;
DROP FUNCTION IF EXISTS decrypt_dni(TEXT);
DROP FUNCTION IF EXISTS encrypt_dni(TEXT);
DROP FUNCTION IF EXISTS get_encryption_key();

-- 5. Re-run migrations 066 and 069 to restore original functions
-- See: 066_create_mesas_functions.sql
-- See: 069_update_bartender_scan_add_sector.sql

-- 6. Remove encryption key setting
ALTER DATABASE postgres RESET app.encryption_key;
```

## Performance Considerations

### Encryption Overhead
- **Write operations**: Slight overhead (~1-2ms per encryption)
- **Read operations**: Slight overhead (~1-2ms per decryption)
- **Impact**: Negligible for typical event management operations

### Index Limitation
- **Cannot index encrypted data** for searching
- **Removed**: `idx_ventas_mesas_cliente_dni` index
- **Workaround**: If you need to search by DNI frequently, consider:
  1. Using QR code search instead (already indexed)
  2. Maintaining a separate encrypted lookup table with hash
  3. Implementing search via application layer after decryption

### Recommendations
- Use the `ventas_mesas_decrypted` view for most SELECT queries
- Use RPC functions for scan operations (already optimized)
- Avoid decrypting in WHERE clauses (won't use indexes anyway)

## Security Best Practices

### Encryption Key Management
1. **Generate strong keys**: 32+ characters, random, alphanumeric + symbols
2. **Store securely**: Password manager or secrets vault (e.g., AWS Secrets Manager, Vault)
3. **Never commit**: Add to `.gitignore` if stored in files
4. **Rotate periodically**: Plan for key rotation (requires re-encryption)

### Advanced: Supabase Vault (Production)
For production deployments, consider using Supabase Vault:
```sql
-- Create secret in Vault
SELECT vault.create_secret('your-secret-key', 'encryption_key');

-- Update get_encryption_key() to use Vault
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'encryption_key'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### RLS Protection
- Encryption is **defense in depth**, RLS is still primary security
- Even encrypted, data is protected by club-based RLS policies
- Only authenticated users from the correct club can see data
- Decryption functions inherit RLS policies from the table

## Troubleshooting

### Error: "Failed to decrypt DNI"
**Cause**: Encryption key doesn't match the key used to encrypt
**Fix**:
1. Check current key: `SHOW app.encryption_key;`
2. Ensure it matches the key you set
3. If key was changed, data encrypted with old key cannot be decrypted

### Error: "Function get_encryption_key() does not exist"
**Cause**: Migration not fully executed
**Fix**: Re-run the migration from the beginning

### Decrypted value is NULL
**Cause**:
- Encryption key not set (using default)
- Data was encrypted with different key
**Fix**:
1. Set the correct encryption key
2. Test with `SELECT decrypt_dni(encrypt_dni('test'));`

### Frontend receives encrypted data
**Cause**: Using `ventas_mesas` table directly instead of view or RPC
**Fix**:
- Switch to `ventas_mesas_decrypted` view
- Or use the RPC functions which auto-decrypt

## FAQ

**Q: Is this GDPR/data protection compliant?**
A: This adds encryption at rest, which helps with compliance. For full GDPR compliance, you also need: data minimization, consent management, right to erasure, and proper key management.

**Q: Can I search by DNI after encryption?**
A: Not directly via SQL index. You must either:
- Search by QR code (still indexed)
- Decrypt all records and filter in application layer
- Implement a separate hash-based lookup table

**Q: What if I lose the encryption key?**
A: **Data is permanently lost**. There is no recovery method. Always backup the key securely.

**Q: Does this protect against SQL injection?**
A: No, encryption protects data at rest. SQL injection is prevented by Supabase's parameterized queries and RLS.

**Q: Should I encrypt other fields too?**
A: Consider encrypting: `cliente_nombre`, `cliente_email`, `telefono` if they exist. But evaluate the tradeoff: more encryption = less searchability.

**Q: What about existing QR codes?**
A: QR codes are **not encrypted** (they're already random UUIDs). They remain searchable and indexable.

## Support

If you encounter issues:
1. Check the verification section output from the migration
2. Review the troubleshooting section above
3. Test with the provided SQL queries
4. Check Supabase logs for detailed error messages

## Related Files

- Migration: `supabase_script/supabase_scripts/070_encrypt_cliente_dni.sql`
- Original functions: `066_create_mesas_functions.sql`, `069_update_bartender_scan_add_sector.sql`
- Table schema: `064_create_mesas_ventas.sql`
