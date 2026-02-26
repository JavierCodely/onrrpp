# Migration 072: Fix Supabase Linter Security Issues

## Overview

This migration resolves all security warnings and errors detected by the Supabase Database Linter. The issues were identified in the Supabase Dashboard and reported via the linter tool.

## Issues Fixed

### 1. ERROR: Security Definer View (1 issue)

**Problem**: The view `ventas_mesas_decrypted` was defined with `SECURITY DEFINER` (the default behavior when `security_invoker` is not set to `true`). This means the view executes with the permissions of the view creator rather than the querying user, potentially bypassing Row Level Security (RLS).

**Fix**: Recreated the view with `WITH (security_invoker = true)` to ensure it enforces RLS policies using the caller's permissions.

**View affected**:
- `public.ventas_mesas_decrypted`

---

### 2. WARN: Function Search Path Mutable (45 functions)

**Problem**: Functions without a fixed `search_path` are vulnerable to search path manipulation attacks. A malicious user could create functions or tables in schemas that appear earlier in the search path, causing the function to execute unintended code.

**Fix**: Added `SET search_path = public` to all 45 functions to ensure they only reference objects in the `public` schema.

**Functions affected** (grouped by category):

#### Core RLS and Auth Functions (4)
- `get_current_user_club()`
- `get_current_user_role()`
- `check_user_has_role(user_role_type)`
- `user_belongs_to_club(uuid)`

#### Validation Functions (10)
- `validate_admin_creates_evento()`
- `validate_rrpp_creates_invitado()`
- `validate_venta_montos()`
- `validate_personal_grupo()`
- `validate_lotes_seguridad_role()`
- `validate_sectores_seguridad_role()`
- `validate_mesa_state()`
- `validate_venta_mesa()`
- `validate_escaneo_mesa()`

#### Trigger Functions - Invitados (6)
- `increment_total_invitados()`
- `decrement_total_invitados()`
- `update_total_ingresados()`
- `handle_delete_ingresado()`
- `prevent_delete_ingresados()`
- `auto_set_fecha_ingreso()`

#### Trigger Functions - Clientes (7)
- `auto_create_or_find_cliente()`
- `sync_cliente_data_on_invitado_update()`
- `validar_cliente_lote_unico()`
- `incrementar_ingresos_cliente_por_club()`
- `decrementar_ingresos_cliente_on_delete()`
- `trigger_populate_dni_hash_clientes()`
- `trigger_populate_dni_hash_invitados()`

#### Trigger Functions - Mesas (6)
- `update_mesa_on_venta_created()`
- `prevent_venta_mesa_deletion_with_scans()`
- `reset_mesa_on_venta_deleted()`
- `prevent_estado_change_with_venta()`
- `increment_escaneos_seguridad()`
- `prevent_duplicate_bartender_scan()`

#### Trigger Functions - General (2)
- `update_updated_at_column()`
- `decrement_lote_cantidad()`

#### RPC Functions - Invitados (6)
- `marcar_ingreso(text, boolean, boolean)`
- `rechazar_invitado(uuid)`
- `check_cliente_denegado(text)`
- `get_invitado_scan_info(text)`
- `mark_invitado_ingresado(uuid)`
- `handle_dni_change_on_update()`

#### RPC Functions - Mesas (6)
- `reservar_mesa(uuid, uuid)`
- `liberar_reserva_mesa(uuid)`
- `vender_mesa(...)`
- `escanear_mesa_seguridad(text, uuid)`
- `escanear_mesa_bartender(text, uuid)`
- `get_mesa_escaneos_count(uuid)`

#### RPC Functions - Security Assignment (5)
- `get_my_assigned_lotes(uuid)`
- `check_seguridad_can_scan(uuid, uuid)`
- `get_my_assigned_sectores(uuid)`
- `get_seguridad_by_sector(uuid)`
- `assign_seguridad_to_sector(uuid, uuid)`

#### RPC Functions - Auth (3)
- `log_auth_attempt(text, boolean, text, text, text)`
- `get_failed_login_attempts(text, interval)`
- `cleanup_old_auth_logs()`

#### Utility Functions (4)
- `generate_unique_qr_code()`
- `set_invitado_qr_code()`
- `get_evento_club(uuid)`
- `calculate_edad_from_fecha_nacimiento(date)`

#### Encryption Functions (4)
- `get_encryption_key()`
- `encrypt_dni(text)`
- `decrypt_dni(bytea)`
- `hash_dni(text)`

---

### 3. WARN: RLS Policy Always True (1 policy)

**Problem**: The table `clientes_ingresos_por_club` had a policy named `"System can manage ingresos"` with `USING (true)` and `WITH CHECK (true)` for ALL operations. This effectively bypassed RLS for INSERT/UPDATE/DELETE operations, creating a security hole.

**Root Cause**: This table is managed exclusively by SECURITY DEFINER triggers (`incrementar_ingresos_cliente_por_club` and `decrementar_ingresos_cliente_on_delete`), which automatically bypass RLS. The overly permissive policy was unnecessary.

**Fix**: Dropped the `"System can manage ingresos"` policy. The table now has only one policy:
- `"Users can view ingresos of their club"` (SELECT only, filtered by `uuid_club`)

**Why this is safe**:
- Users can only SELECT data from their own club (enforced by RLS)
- INSERT/UPDATE/DELETE operations are handled exclusively by SECURITY DEFINER triggers, which bypass RLS by design
- No user-facing code should directly modify this table

---

### 4. WARN: Leaked Password Protection Disabled (Dashboard Setting)

**Problem**: Supabase Auth can check passwords against the HaveIBeenPwned.org database to prevent users from using compromised passwords. This feature is currently disabled.

**Fix**: This is a Supabase Dashboard setting, not a SQL migration. **Manual action required** (see below).

---

## Manual Steps Required

### Enable Leaked Password Protection

This setting cannot be changed via SQL. You must enable it in the Supabase Dashboard:

1. Go to the Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Policies** (or **Settings** → **Authentication**)
4. Find the setting **"Leaked Password Protection"** or **"Password Strength and Leaked Password Protection"**
5. Toggle it **ON**

**Documentation**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**What this does**: When enabled, Supabase Auth checks new passwords and password changes against the HaveIBeenPwned API to reject commonly breached passwords.

---

## Execution Instructions

### 1. Run the SQL Migration

Execute the migration script in the Supabase Dashboard SQL Editor:

```bash
# File location:
supabaseError/072_fix_supabase_linter_issues.sql
```

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the entire contents of `072_fix_supabase_linter_issues.sql`
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### 2. Verify the Migration

Run the verification queries included at the bottom of the migration script:

```sql
-- 1. Verify view has security_invoker = true
SELECT viewname, viewowner, definition
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'ventas_mesas_decrypted';

-- Expected: The definition should include "WITH (security_invoker = true)"

-- 2. Verify functions have search_path set (sample check)
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as args,
    p.prosecdef as is_security_definer,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_current_user_club', 'marcar_ingreso', 'encrypt_dni')
ORDER BY p.proname;

-- Expected: All functions should have config = {"search_path=public"}

-- 3. Verify RLS policies on clientes_ingresos_por_club
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clientes_ingresos_por_club';

-- Expected: Only 1 policy named "Users can view ingresos of their club" for SELECT
```

### 3. Re-run Supabase Linter

After executing the migration and enabling leaked password protection:

1. Go to Supabase Dashboard → **Database** → **Linter**
2. Click **Run Linter** or **Refresh**
3. Verify that all errors and warnings are resolved

**Expected results**:
- ✅ 0 ERRORS
- ✅ 0 WARNINGS (after enabling leaked password protection)

---

## Impact Assessment

### Breaking Changes

**None**. This migration only adds security restrictions and does not change existing functionality:

- The `ventas_mesas_decrypted` view will still work exactly the same for authenticated users
- All 45 functions will continue to work as before (they already implicitly used the public schema)
- The `clientes_ingresos_por_club` table is still accessible for SELECT queries and still managed by triggers

### Performance Impact

**Negligible**. Setting `search_path` on functions may have a tiny performance improvement (no schema searching), and removing the overly permissive RLS policy simplifies the security layer.

### Security Impact

**Significant improvement**:
- The view now properly enforces RLS using the caller's permissions
- Functions are protected against search path manipulation attacks
- The `clientes_ingresos_por_club` table has proper RLS (SELECT-only for users)

---

## Rollback Instructions

If you need to rollback this migration (NOT RECOMMENDED), the rollback commands are included at the bottom of the migration script, commented out. Simply uncomment and execute them.

**Warning**: Rollback will reintroduce the security vulnerabilities.

---

## Related Migrations

- **070_encrypt_cliente_dni.sql**: Original creation of `ventas_mesas_decrypted` view
- **042_create_clientes_table.sql**: Original creation of `clientes_ingresos_por_club` table and RLS policies

---

## References

- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter)
- [Security Definer View Issue (0010)](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [Function Search Path Issue (0011)](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [RLS Policy Always True Issue (0024)](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)
- [Password Security Settings](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## Summary

| Issue | Type | Count | Fix |
|-------|------|-------|-----|
| Security Definer View | ERROR | 1 | Recreated view with `security_invoker = true` |
| Function Search Path Mutable | WARN | 45 | Added `SET search_path = public` to all functions |
| RLS Policy Always True | WARN | 1 | Dropped overly permissive policy |
| Leaked Password Protection | WARN | 1 | **Manual**: Enable in Supabase Dashboard |

**Total SQL Fixes**: 47 (1 view + 45 functions + 1 policy)
**Total Manual Fixes**: 1 (Dashboard setting)
