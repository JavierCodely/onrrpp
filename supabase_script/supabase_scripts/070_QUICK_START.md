# Migration 070: Quick Start Guide

## TL;DR - 5 Minute Setup

### 1. Run the Migration
Execute `070_encrypt_cliente_dni.sql` in Supabase SQL Editor

### 2. Set Encryption Key (CRITICAL)
```sql
-- Generate a strong key first (use password manager or OpenSSL)
ALTER DATABASE postgres SET app.encryption_key = 'your-32-char-minimum-secret-key-here';
```

### 3. Verify It Works
```sql
-- Should return matching values
SELECT
    cliente_dni_plaintext AS original,
    decrypt_dni(cliente_dni) AS decrypted
FROM public.ventas_mesas LIMIT 5;
```

### 4. Update Frontend (Optional)
```typescript
// Option A: Use the decrypted view
const { data } = await supabase
  .from('ventas_mesas_decrypted')  // Auto-decrypts
  .select('*');

// Option B: RPC functions already decrypt automatically (no changes needed)
const result = await supabase.rpc('escanear_mesa_seguridad', { ... });
// result.cliente_dni is already decrypted
```

### 5. Cleanup (After Testing)
```sql
-- Drop the backup column
ALTER TABLE public.ventas_mesas DROP COLUMN cliente_dni_plaintext;
```

## What You Get

✅ **AES-256 encryption** for all `cliente_dni` values
✅ **Transparent decryption** via RPC functions
✅ **New view** `ventas_mesas_decrypted` for easy queries
✅ **RLS policies** still enforced (club isolation)
✅ **Backward compatible** - RPC functions unchanged from frontend perspective

## Important Notes

⚠️ **BACKUP YOUR ENCRYPTION KEY** - If lost, data cannot be recovered
⚠️ **Test before cleanup** - Keep `cliente_dni_plaintext` until verified
⚠️ **Cannot index encrypted data** - Search by QR code instead of DNI

## Need Help?

- Full guide: `070_ENCRYPTION_GUIDE.md`
- Test queries: `070_TEST_QUERIES.sql`
- Migration script: `070_encrypt_cliente_dni.sql`
