# Supabase Database Migrations - ONRRPP v2

## Overview

This directory contains **37 consolidated SQL migration scripts** organized in **7 phases** for the ONRRPP multi-tenant event management platform.

**Total Scripts**: 37 (down from 50 original files)
**Resolved Issues**:
- 3 duplicate numbering conflicts (011, 029, 030)
- 8 obsolete iterative fixes consolidated
- 4 RLS fix scripts merged into single consolidated version

---

## Directory Structure

```
supabase_script/
├── 001_core/                     # FASE 1: Core Schema (10 scripts)
├── 002_extensions/               # FASE 2: QR, Lotes, Ventas (4 scripts)
├── 003_vip_features/             # FASE 3: VIP & Ubicaciones (5 scripts)
├── 004_rls_and_security/         # FASE 4: RLS & Auth Logs (5 scripts)
├── 005_views_and_stats/          # FASE 5: Business Views (5 scripts)
├── 006_triggers_final/           # FASE 6: Triggers with SECURITY DEFINER (2 scripts)
├── 007_grupos_and_features/      # FASE 7: Grupos & Advanced Features (6 scripts)
└── README.md                     # This file
```

---

## Execution Order

### Prerequisites
- Supabase project created
- Database connection established
- Admin access to Supabase Dashboard SQL Editor

### FASE 1: CORE SCHEMA (Required - Execute First)

Execute in **strict order**:

```bash
001_core/001_create_enums.sql              # Enums: user_role, sexo_type
001_core/002_create_clubs.sql              # Multi-tenant root table
001_core/003_create_personal.sql           # User profiles + auth integration
001_core/004_create_eventos.sql            # Events table
001_core/005_create_invitados.sql          # Guest list table
001_core/006_create_functions.sql          # Helper functions for RLS
001_core/007_create_rls_policies.sql       # Row Level Security policies
001_core/008_create_triggers.sql           # Basic triggers (will be upgraded in FASE 6)
001_core/009_seed_data.sql                 # OPTIONAL: Sample data for testing
001_core/010_create_storage_buckets.sql    # Storage for event banners
```

**Critical**: Do NOT skip any script in this phase. All subsequent phases depend on this foundation.

---

### FASE 2: EXTENSIONS (QR, Lotes, Ventas)

```bash
002_extensions/011_add_qr_to_invitados.sql                # QR code generation
002_extensions/012_create_lotes.sql                       # Ticket batches (CONSOLIDATED)
002_extensions/013_create_ventas.sql                      # Sales tracking
002_extensions/014_enable_realtime_eventos_invitados.sql  # Realtime for eventos/invitados
```

**Note**: Script `012_create_lotes.sql` is **CRITICAL** - it consolidates 5 previous versions with the final working triggers using FOR UPDATE locks.

---

### FASE 3: VIP FEATURES & UBICACIONES

```bash
003_vip_features/015_add_profile_image_to_invitados.sql   # Profile image for VIP
003_vip_features/016_create_vip_profiles_storage.sql      # Storage bucket for VIP images
003_vip_features/017_create_ubicaciones.sql               # Argentina locations catalog
003_vip_features/018_update_invitados_ubicacion.sql       # Split ubicacion → departamento/localidad
003_vip_features/019_add_iguazu_localidades.sql           # Additional Iguazú localities
```

---

### FASE 4: RLS & SECURITY

```bash
004_rls_and_security/020_rls_policies_consolidated.sql    # RLS policies (CONSOLIDATED)
004_rls_and_security/021_verify_and_fix_realtime.sql      # Realtime verification
004_rls_and_security/022_prevent_delete_ingresados.sql    # Trigger: block delete if ingresado=true
004_rls_and_security/023_prevent_edit_ingresados.sql      # RLS: RRPP can't edit checked-in guests
004_rls_and_security/024_create_auth_logs.sql             # Authentication audit logs
```

**Note**: Script `020_rls_policies_consolidated.sql` merges 4 previous RLS fix scripts (015, 016, 017) into one definitive version without recursion issues.

---

### FASE 5: VIEWS & STATS

```bash
005_views_and_stats/025_add_rrpp_counters_view.sql        # eventos_rrpp_stats view
005_views_and_stats/026_rrpp_view_consolidated.sql        # RRPP view fixes (CONSOLIDATED)
005_views_and_stats/027_add_comision_rrpp_to_lotes.sql    # Commission fields + ventas_rrpp_stats
005_views_and_stats/028_ventas_rrpp_stats_with_vip.sql    # Add VIP flag to view
005_views_and_stats/029_fix_rrpp_view_inactive_lotes.sql  # Handle inactive lotes
```

---

### FASE 6: TRIGGERS FINAL (CRITICAL)

```bash
006_triggers_final/030_recreate_trigger_functions.sql     # Recreate triggers with SECURITY DEFINER
006_triggers_final/031_recalculate_counters.sql           # UTILITY: Manual counter recalculation
```

**CRITICAL**: Script `030_recreate_trigger_functions.sql` is **MANDATORY**. It adds `SECURITY DEFINER` to all counter triggers, allowing them to bypass RLS policies. Without this, counters won't update properly.

**Note**: Script `031` is a utility - only run if counters are out of sync.

---

### FASE 7: GRUPOS & ADVANCED FEATURES

```bash
007_grupos_and_features/032_add_grupos_to_personal_and_lotes.sql   # Grupo system (A/B/C/D)
007_grupos_and_features/033_add_fecha_nacimiento_and_admin_policy.sql  # Birth date + auto-age
007_grupos_and_features/034_add_lote_activo_validation.sql         # Validate active lotes
007_grupos_and_features/035_enable_realtime_lotes.sql              # Realtime for lotes
007_grupos_and_features/036_add_acreditacion_fields_to_ventas.sql  # Payment tracking
007_grupos_and_features/037_fix_ventas_update_policy.sql           # RRPP can delete ventas
```

---

## Key Consolidation Notes

### Resolved Duplicate Numbering

| Original Issue | Resolution |
|----------------|------------|
| Two scripts numbered `011` | Realtime → 014, Profile Image → 015 |
| Two scripts numbered `029` | VIP stats → 028, Acreditación → 036 |
| Two scripts numbered `030` | Grupos → 032, Fix ventas → 037 |

### Major Consolidations

| Consolidated Script | Merged From | Key Changes |
|---------------------|-------------|-------------|
| `012_create_lotes.sql` | update/002 + update/005 | Uses FOR UPDATE lock, BEFORE+AFTER pattern |
| `020_rls_policies_consolidated.sql` | 007 + 015 + 016 + 017 | Removed recursion, simplified field validation |
| `026_rrpp_view_consolidated.sql` | 020 + 025 + 026 | Fixed NULL handling, improved GROUP BY |
| `030_recreate_trigger_functions.sql` | 008 + 024 | **SECURITY DEFINER** on all triggers |

---

## Post-Migration Validation

After executing all migrations, run these verification queries:

### 1. Verify All Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected**: `clubs`, `personal`, `eventos`, `invitados`, `lotes`, `ventas`, `ubicaciones`, `auth_logs`

### 2. Verify Critical Triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'invitados';
```

**Expected on invitados**:
- `increment_total_invitados_trigger`
- `decrement_total_invitados_trigger`
- `update_total_ingresados_trigger`
- `prevent_delete_ingresados_trigger`
- `trigger_validar_lote_disponibilidad`
- `trigger_incrementar_contador_lote`
- `trigger_manejar_cambio_lote`

### 3. Verify RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**All tables should have** `rowsecurity = true`

### 4. Verify Realtime Tables

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**Expected**: `eventos`, `invitados`, `lotes`

### 5. Test Functional Operations

```sql
-- Test 1: Create evento (as admin)
-- Test 2: Add invitado → verify total_invitados increments
-- Test 3: Mark ingresado → verify total_ingresados increments
-- Test 4: Try to delete ingresado=true invitado → should fail
```

---

## Troubleshooting

### Issue: "Personal no encontrado"
**Cause**: User exists in `auth.users` but not in `personal` table
**Solution**: Create personal record with matching UUID

```sql
INSERT INTO public.personal (id, nombre, apellido, sexo, rol, uuid_club, activo)
VALUES ('auth-uuid', 'Nombre', 'Apellido', 'hombre', 'admin', 'club-uuid', true);
```

### Issue: Counters not updating
**Symptoms**: `total_invitados` or `total_ingresados` stuck at 0
**Solution**:
1. Verify triggers exist (query above)
2. Ensure `030_recreate_trigger_functions.sql` was executed
3. Run `006_triggers_final/031_recalculate_counters.sql`

### Issue: RLS blocks queries
**Symptoms**: "permission denied" errors
**Checks**:
1. User has `activo = true` in personal
2. User's `uuid_club` matches data being queried
3. Test RLS functions: `SELECT public.get_current_user_club()`

### Issue: Lote validation failing
**Symptoms**: Cannot add invitados to lote
**Checks**:
1. Lote has `activo = true`
2. `cantidad_actual < cantidad_maxima`
3. Trigger `validar_lote_disponibilidad` exists

---

## Migration for Existing Database

If you have an existing database with data:

### Option A: Incremental Migration (Recommended)

1. **Backup** your database first
2. **Check current state**:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```
3. **Identify missing migrations**: Compare with execution order above
4. **Apply only missing scripts** in order
5. **Run counter recalculation**: `031_recalculate_counters.sql`

### Option B: Fresh Start (Development Only)

```sql
-- WARNING: This destroys ALL data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then execute all migrations from FASE 1
```

---

## Key Design Decisions

1. **Multi-tenant isolation**: Every query filtered by `uuid_club` via RLS
2. **SECURITY DEFINER triggers**: Required for counter updates to bypass RLS
3. **Simplified RLS policies**: Field validation moved to application layer to avoid recursion
4. **FOR UPDATE locks**: Prevent race conditions in lote capacity validation
5. **Realtime enabled**: For `eventos`, `invitados`, `lotes` tables
6. **Grupo system**: A/B/C/D segmentation for RRPPs and lotes visibility
7. **Idempotent scripts**: Use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` where possible

---

## Important Notes

### DO NOT Execute on Production

- `009_seed_data.sql` - Sample data for testing only
- `031_recalculate_counters.sql` - Only if counters are incorrect

### Required Environment Variables (Frontend)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

### Maintenance Scripts

- **Cleanup auth logs** (run monthly):
  ```sql
  SELECT public.cleanup_old_auth_logs();
  ```

- **Verify counter consistency**:
  ```sql
  -- Execute last SELECT from 031_recalculate_counters.sql
  ```

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review CLAUDE.md in project root
3. Verify execution order was followed exactly
4. Check Supabase Dashboard → Logs for errors

---

## Version History

- **v2.0** (2025-12-10): Consolidated 50 scripts → 37 scripts
  - Resolved 3 duplicate numbering conflicts
  - Merged 8 obsolete iterative fixes
  - Consolidated RLS policies (4 scripts → 1)
  - Added SECURITY DEFINER to all triggers
  - Organized into 7 logical phases

- **v1.0** (Original): 50+ scripts in migrations/ and migrations/update/

---

## Files Not Migrated

The following files were intentionally excluded (diagnostic/temporary):
- `DIAGNOSTICO_LOTES.sql`
- `DEBUG_LOTES.sql`
- `VERIFICAR_TRIGGERS.sql`
- `apply_iguazu_migration.sql`
- `update/004-008_fix_lote_triggers*.sql` (obsolete iterations)

These can be found in the original `supabase/migrations/` directory if needed.
