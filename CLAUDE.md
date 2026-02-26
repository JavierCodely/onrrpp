# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant event management platform with role-based access control (Admin, RRPP, Seguridad). Built with React + TypeScript + Vite frontend and Supabase PostgreSQL backend with Row Level Security (RLS).

## Development Commands

### Frontend
- `npm run dev` - Start Vite dev server (http://localhost:5173)
- `npm run build` - TypeScript compile + production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Database Migrations
- Execute migrations in numerical order via Supabase Dashboard SQL Editor
- **Migrations location**: `supabase_script/` directory with two structures:
  - **Organized by category**: `001_core/`, `002_extensions/`, `003_vip_features/`, etc.
  - **Flat structure**: `supabase_scripts/` (001-046+)
- Core migrations: `001` through `010` (schema setup)
- Feature migrations: `011+` (realtime, storage, ubicaciones, RLS fixes, triggers, clientes)
- **Critical**: Always run migrations in order to avoid dependency issues

## Architecture

### Multi-Tenant Design
- **Isolation Key**: `uuid_club` - Every data access filtered by user's club
- **RLS Functions**: 
  - `get_current_user_club()` - Returns authenticated user's club UUID
  - `get_current_user_role()` - Returns user's role enum
- **Critical**: All queries MUST respect club isolation via RLS policies

### Authentication Flow
1. Supabase Auth handles login (email/password)
2. `auth.service.ts` fetches user → personal table → club data
3. Zustand store (`auth.store.ts`) manages session state
4. `ProtectedRoute` component guards all authenticated routes
5. `DashboardRouter` redirects to role-specific dashboard

### Security Features
**Authentication Security** (see `SECURITY.md` for details):
- **Audit Logging**: All login attempts tracked in `auth_logs` table
  - Success, failures, and logouts with timestamps
  - User agent and IP address (optional)
  - 90-day retention policy
- **Rate Limiting**: Brute force protection
  - Max 5 failed attempts per email in 15 minutes
  - 5-minute temporary lockout after threshold
  - Visual counter and countdown timer
- **reCAPTCHA v2**: Auto-enables after multiple failed attempts
  - Required environment variable: `VITE_RECAPTCHA_SITE_KEY`
  - Configure at: https://www.google.com/recaptcha/admin
- **Password Visibility Toggle**: UX improvement without security compromise
- **Migration**: `036_create_auth_logs.sql` must be executed

### Database Schema
**Core Tables** (see `supabase/README.md` for full schema):
- `clubs` - Tenant root, all data cascades from here
- `personal` - User profiles (id references auth.users), includes rol enum
- `eventos` - Events with auto-counters: `total_invitados`, `total_ingresados`
- `invitados` - Guest lists per event with `pais`, `provincia`, `departamento`, `localidad` (hierarchical location)
- `lotes` - Ticket batches per event with `es_vip` flag
- `ventas` - Sales tracking (optional, may not exist in all deployments)
- `ubicaciones` - Hierarchical location catalog (pais/provincia/departamento/localidad) for Argentina, Brasil, Paraguay
- `eventos_rrpp_stats` - View showing RRPP-specific stats per event
- `auth_logs` - Audit log of authentication attempts (login success/failed, logout)
- `clientes` - **GLOBAL** client database (shared across all clubs, DNI unique globally)
- `clientes_ingresos_por_club` - Tracks client entries per club

**Auto-Increment Triggers** (with `SECURITY DEFINER`):
- `increment_total_invitados()` - +1 on INSERT to invitados
- `decrement_total_invitados()` - -1 on DELETE from invitados
- `update_total_ingresados()` - Tracks ingresado state changes
- `handle_delete_ingresado()` - Decrements counter on delete if was ingresado
- `prevent_delete_ingresados()` - BLOCKS deletion of invitados who already entered

**Critical Constraints**:
- `personal.id` MUST match `auth.users.id` (FK to Supabase Auth)
- `invitados.dni` unique per event (not globally)
- **Cannot delete** invitados where `ingresado = true`
- VIP invitados require `profile_image_url`
- All tables have `updated_at` trigger

### Role Permissions (enforced by RLS)
**Admin**:
- Create/update/delete eventos for their club
- View **total** invitados/ingresados across all RRPP
- Manage lotes (ticket batches)
- Cannot manage invitados directly

**RRPP**:
- View eventos in their club (active only)
- Create/update/delete **their own** invitados only
- View **only their own** invitados/ingresados count via `eventos_rrpp_stats` view
- Cannot modify `ingresado` status or `fecha_ingreso`
- Cannot delete invitados who already entered (`ingresado = true`)

**Seguridad**:
- View eventos and invitados in their club
- Update ONLY `ingresado` and `fecha_ingreso` fields via QR scanner
- Cannot create/delete invitados
- Cannot modify any other invitado fields

### Realtime Features
**Supabase Realtime** is enabled for:
- `eventos` table - Admin sees live updates of `total_invitados` and `total_ingresados`
- `invitados` table - RRPP sees live updates when their invitados are scanned/modified

**Implementation Pattern**:
```typescript
// Admin: Listen to eventos UPDATE
supabase.channel('eventos-changes').on('postgres_changes', { event: 'UPDATE', table: 'eventos' }, ...)

// RRPP: Listen to ALL invitados changes, filter by id_rrpp
supabase.channel('invitados-rrpp').on('postgres_changes', { event: '*', table: 'invitados' }, ...)
```

**Critical**: Realtime requires `ALTER PUBLICATION supabase_realtime ADD TABLE eventos/invitados`

### State Management
- **Zustand** for auth state (`useAuthStore`)
- Store persists: user object (personal + club data)
- No global state for domain data - fetch directly from Supabase with RLS
- **Realtime subscriptions** update local state automatically

### Component Structure
- **Atomic Design** directories: `atoms/`, `molecules/`, `organisms/`, `pages/`, `templates/`
- **shadcn/ui** components in `components/ui/` (pre-installed, full suite)
- Use `cn()` utility from `lib/utils.ts` for className merging
- **Mobile-first dialogs**: Use `fixed bottom-5` for action buttons on mobile forms
- **SelectContent scroll**: Use `className="max-h-[40vh] overflow-y-auto"` for long lists (provinces, localities)

## Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key  # For login security (optional but recommended)
```

### Styling
- Tailwind CSS v3 (NOT v4 - causes build issues)
- CSS variables in `src/index.css` for theming
- Dark mode via `.dark` class (next-themes installed)
- **Mobile utilities**: `.pb-safe` uses `env(safe-area-inset-bottom)` for notch support
- HTTPS required for camera access: `@vitejs/plugin-basic-ssl` configured

## Database Migrations Execution Order

### Core Schema (001-010)
1. `001_create_enums.sql` - user_role, sexo_type enums
2. `002_create_clubs.sql` - Tenant root table
3. `003_create_personal.sql` - User profiles + auth integration
4. `004_create_eventos.sql` - Events with banner_url, counters
5. `005_create_invitados.sql` - Guest lists
6. `006_create_functions.sql` - Helper functions for RLS
7. `007_create_rls_policies.sql` - Row Level Security policies
8. `008_create_triggers.sql` - Auto-increment triggers, validations
9. `009_seed_data.sql` - Sample clubs (optional)
10. `010_create_storage_buckets.sql` - Storage for event banners

### Feature Additions (011+)
- `011_enable_realtime.sql` / `018_verify_and_fix_realtime.sql` - Enable realtime on eventos/invitados
- `012_create_vip_profiles_storage.sql` - VIP profile images storage
- `013_create_ubicaciones.sql` - Argentina departments/localities catalog
- `014_update_invitados_ubicacion.sql` - Split ubicacion into departamento/localidad
- `020_add_rrpp_counters_view.sql` - Create `eventos_rrpp_stats` view for RRPP stats
- `021_prevent_delete_ingresados.sql` - Block deletion of checked-in invitados
- `024_recreate_trigger_functions.sql` - Fix trigger functions with SECURITY DEFINER
- `036_create_auth_logs.sql` - Create auth_logs table for audit logging (login security)

### Recent Additions (037+)
- `041_add_acreditacion_fields_to_ventas.sql` - Add acreditacion tracking to ventas
- `042_create_clientes_table.sql` - Create global clientes table (shared across clubs)
- `043_update_invitados_with_clientes.sql` - Link invitados to clientes via `uuid_cliente`
- `044_create_cliente_triggers_and_validations.sql` - Triggers for client-invitado sync
- `045_migrate_existing_invitados_to_clientes.sql` - Data migration for existing invitados
- `046_cleanup_invitados_redundant_fields.sql` - Remove redundant fields from invitados

### Hierarchical Location System (051-054)
- `051_add_pais_provincia_to_ubicaciones.sql` - Add pais/provincia columns to ubicaciones table
- `052_add_pais_provincia_to_invitados_clientes.sql` - Add pais/provincia to invitados and clientes tables
- `053_seed_ubicaciones_argentina_brasil_paraguay.sql` - Seed ~500+ locations for Argentina, Brasil, Paraguay
- `054_update_check_cliente_denegado_function.sql` - Update RPC function to return pais/provincia

### Lotes-Seguridad Assignment (057-060)
- `057_create_lotes_seguridad_assignment.sql` - Create `lotes_seguridad` table (many-to-many), RLS policies, validation trigger
- `058_integrate_lotes_seguridad_with_scan_functions.sql` - Update `rechazar_invitado()`, create view `seguridad_lotes_asignados`
- `059_update_marcar_ingreso_allow_rejected.sql` - Enhanced `marcar_ingreso(qr, resolver, soloVerificar)` with rejection resolution
- `060_fix_rechazar_invitado_lote_check.sql` - Fix lote assignment check (allow any security if no assignments)

**Lotes-Seguridad Flow**:
- Admin assigns security personnel to lotes via EventosPage
- Only assigned security can scan QR codes from that lote
- If no security assigned to lote, any security can scan
- Function `marcar_ingreso(p_qr_code, p_resolver_rechazo, p_solo_verificar)`:
  - `p_solo_verificar = true`: Only validates, doesn't mark entry
  - `p_resolver_rechazo = true`: Clears previous rejection and marks entry
  - Both `false`: Normal entry marking

**Troubleshooting migrations**:
- `031_recalculate_counters.sql` - Manually recalculate event counters

## Testing Setup
Must create test user:
1. Create user in Supabase Auth Dashboard (get UUID)
2. Insert into personal table:
```sql
INSERT INTO personal (id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club, activo)
VALUES ('auth-uuid-here', 'Test', 'User', 30, 'hombre', 'Buenos Aires', 'admin', 'club-uuid', true);
```

## Common Issues

### "Personal no encontrado" error
- User exists in auth.users but NOT in personal table
- personal.id must EXACTLY match auth.users.id UUID

### Build fails with Tailwind
- Use Tailwind v3, NOT v4 (@tailwindcss/vite has compatibility issues)
- Config: `tailwind.config.js` + `postcss.config.js`

### RLS blocks queries unexpectedly
- Check `activo = true` on personal record
- Verify user's uuid_club matches queried data's uuid_club
- Test RLS functions in SQL Editor: `SELECT get_current_user_club()`

### Counters not updating (total_invitados/total_ingresados)
1. **Verify triggers exist**: Query `information_schema.triggers` for `increment_total_invitados_trigger`, etc.
2. **Check trigger functions**: Functions must have `SECURITY DEFINER` to work with RLS
3. **Recalculate manually**: Run migration `023_force_recalculate_now.sql`
4. **Enable realtime**: Run `ALTER PUBLICATION supabase_realtime ADD TABLE eventos`
5. **Check console logs**: Look for `📡 Realtime UPDATE recibido` messages

### Camera not working on mobile
- Vite must run with HTTPS: `@vitejs/plugin-basic-ssl` is required
- Browser must have camera permissions granted
- Check console for "getUserMedia" errors

### QR Scanner detecting multiple times
- Use `useRef` instead of `useState` for processing flags
- Pattern: `isProcessingRef.current = true` for immediate synchronous check
- Add countdown delay before re-enabling scanner

### Supabase "more than one relationship" error
- When querying with joins between tables that have multiple foreign keys, specify the FK explicitly
- **Wrong**: `personal!inner(activo)`
- **Correct**: `personal!invitados_id_rrpp_fkey(activo)`
- This commonly happens with `invitados` ↔ `personal` joins in analytics queries

## File Locations

### Authentication
- Service: `src/services/auth.service.ts`
- Store: `src/stores/auth.store.ts`
- Protected routes: `src/components/organisms/ProtectedRoute.tsx`

### Core Services
- `src/services/auth.service.ts` - Authentication (login, logout, getCurrentUser)
- `src/services/auth-logs.service.ts` - Security audit logging (login attempts, failures, logouts)
- `src/services/eventos.service.ts` - Events CRUD + `getEventosRRPPStats()` for RRPP view
- `src/services/invitados.service.ts` - Invitados CRUD + image upload for VIP + `marcarIngreso(qr, resolver, soloVerificar)`
- `src/services/lotes.service.ts` - Ticket batch management
- `src/services/lotes-seguridad.service.ts` - Security-to-lote assignments (assignSeguridadToLote, getLoteAssignments, etc.)
- `src/services/ubicaciones.service.ts` - Hierarchical location service (getPaises, getProvinciasByPais, getDepartamentosByProvincia, getLocalidadesByDepartamentoFull)
- `src/services/clientes.service.ts` - Global client lookup by DNI with denegado check
- `src/services/analytics.service.ts` - Dashboard stats, charts data, filters by país/provincia/departamento
- `src/services/storage.service.ts` - Supabase Storage abstraction
- `src/services/theme.service.ts` - Theme management (mode: light/dark, color: neon-purple/cyan/pink/green/orange)

### Key Pages
- `src/components/pages/LoginPage.tsx` - Login with reCAPTCHA, rate limiting, password visibility toggle
- `src/components/pages/admin/EventosPage.tsx` - Admin events (orchestrator, delegates to modular components)
  - `src/components/pages/admin/eventos/useEventosData.ts` - Custom hook: all state, CRUD, realtime, uploads, seguridad assignment
  - `src/components/pages/admin/eventos/EventosHeader.tsx` - Page title + "Nuevo Evento" button
  - `src/components/pages/admin/eventos/EventosTable.tsx` - Desktop table view
  - `src/components/pages/admin/eventos/EventosCards.tsx` - Mobile card view
  - `src/components/pages/admin/eventos/EventoFormDialog.tsx` - Create/edit evento (shadcn Calendar + time picker)
  - `src/components/pages/admin/eventos/EventoDeleteDialog.tsx` - Delete confirmation
  - `src/components/pages/admin/eventos/LotesManagementDialog.tsx` - Lotes list with progress bars, badges, actions
  - `src/components/pages/admin/eventos/LoteFormDialog.tsx` - Create/edit lote (comisiones, grupos, VIP)
  - `src/components/pages/admin/eventos/LoteDeleteDialog.tsx` - Lote delete confirmation
  - `src/components/pages/admin/eventos/SeguridadAssignmentDialog.tsx` - Assign security personnel to lotes
- `src/components/pages/admin/DashboardPage.tsx` - Admin analytics dashboard (orchestrator, delegates to modular components)
  - `src/components/pages/admin/dashboard/useDashboardData.ts` - Custom hook: all state, data fetching, realtime subscriptions
  - `src/components/pages/admin/dashboard/DashboardFilters.tsx` - 6 filter selects + active filter badges
  - `src/components/pages/admin/dashboard/KPICards.tsx` / `MesasKPICards.tsx` / `GenderKPICards.tsx` - KPI stat cards
  - `src/components/pages/admin/dashboard/AverageAgeCard.tsx` - Average age by gender (registered + ingresados)
  - `src/components/pages/admin/dashboard/HourlyIngressChart.tsx` - Bar chart: ingresos por hora
  - `src/components/pages/admin/dashboard/TopLocalitiesInvitadosChart.tsx` / `TopLocalitiesIngresosChart.tsx` - Locality charts with RRPP drill-down
  - `src/components/pages/admin/dashboard/CountryDistributionChart.tsx` - Pie chart: distribución por país
  - `src/components/pages/admin/dashboard/GenderDistributionCharts.tsx` - Pie + bar: género ingresados vs invitados
  - `src/components/pages/admin/dashboard/TopRRPPsInvitadosChart.tsx` / `TopRRPPsIngresosChart.tsx` / `TopRRPPsMesasChart.tsx` - RRPP ranking charts with drill-down
- `src/components/pages/rrpp/EventosRRPPPage.tsx` - RRPP events with personal counters and lote selection
- `src/components/pages/rrpp/InvitadosPage.tsx` - RRPP invitados management (VIP support)
- `src/components/pages/seguridad/ScannerPage.tsx` - QR scanner with realtime updates

### Invitados Feature (Modular)
- `src/features/invitados/components/InvitadoFormDialog.tsx` - Main form with DNI lookup, collapsible país/provincia selector
- `src/features/invitados/components/LoteSelectionStep.tsx` - Lote selection with availability indicators
- `src/features/invitados/components/InvitadoFormFields.tsx` - Reusable form fields component

### Database
- Schema docs: `supabase/README.md`
- Security docs: `SECURITY.md` (authentication security features)
- Migrations organized: `supabase_script/001_core/` through `007_grupos_and_features/`
- Migrations flat: `supabase_script/supabase_scripts/*.sql` (execute in numerical order)

### Types
- Database types: `src/types/database.ts`
- All types use TypeScript interfaces matching DB schema

## Key Design Decisions

1. **No server-side routing** - Pure client-side React Router with role-based redirects
2. **RLS over API** - Security enforced at database level via PostgreSQL policies
3. **Zustand over Context** - Simpler auth state management, persisted to localStorage
4. **shadcn/ui** - Headless Radix UI components with full Tailwind customization
5. **Tailwind v3** - v4 causes build errors with current Vite setup
6. **Supabase Realtime** - Live counter updates instead of polling
7. **Multi-tenant isolation** - Every query filtered by `uuid_club` via RLS
8. **VIP vs Regular guests** - Separate workflows: VIP requires profile image, allows re-entry
9. **Mobile-first forms** - Fixed bottom buttons, safe-area support for notches
10. **QR Code scanner** - Html5Qrcode library with auto-start, continuous scanning
11. **Global clients** - `clientes` table is shared across clubs (DNI unique globally), `invitados` reference clients per event
12. **Hierarchical locations** - 4-level system: País → Provincia → Departamento → Localidad (defaults: Argentina/Misiones)
13. **Lotes availability UI** - Progress bar only (no numbers), badges: "Últimas disponibles" (50-80%), "SOLD OUT" (100%), disabled when full
