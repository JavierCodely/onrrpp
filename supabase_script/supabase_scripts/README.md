# Supabase Migration Scripts - Clean & Ordered

Este directorio contiene todos los scripts de migración organizados y listos para ejecutar en Supabase **en orden numérico**.

## ✅ Scripts Organizados

Total de scripts: **41 migraciones**

### 🔧 Scripts Removidos/Consolidados

Los siguientes scripts fueron **removidos o consolidados** porque:
- **026_debug_and_fix_rrpp_view.sql** - Solo queries de debug (SELECT/SHOW), sin cambios
- **023_force_recalculate_now.sql** - Script de mantenimiento manual (opcional)
- **019_recalculate_counters.sql** - Script de mantenimiento manual (opcional)
- **update/004-008** - Versiones iterativas de fixes de triggers, reemplazados por scripts posteriores
- **update/009-010** - Ya incorporados en scripts principales

### 📋 Resolución de Duplicados

#### Scripts con número 011 (ambos necesarios):
- ✅ `011_add_profile_image_to_invitados.sql` - Agrega campo profile_image_url
- ✅ `012_enable_realtime.sql` - (antes 011) Habilita realtime en eventos/invitados

#### Scripts con número 030 (ambos necesarios):
- ✅ `031_add_grupos_to_personal_and_lotes.sql` - (antes 030) Agrega sistema de grupos
- ✅ `032_fix_ventas_update_policy.sql` - (antes 030) Arregla política RLS de ventas

### 📦 Scripts del directorio `update/` integrados:
- ✅ `016_add_qr_to_invitados.sql` - QR codes únicos para invitados
- ✅ `017_create_lotes.sql` - Tabla de lotes con triggers y RLS
- ✅ `018_create_ventas.sql` - Tabla de ventas con validaciones
- ✅ `041_add_acreditacion_fields_to_ventas.sql` - Campos de acreditación en ventas

## 🚀 Orden de Ejecución

Ejecutar **todos los scripts en orden numérico** del 001 al 041 en el SQL Editor de Supabase.

### Fase 1: Core Schema (001-010)
```
001_create_enums.sql                    # Enums: user_role, sexo_type
002_create_clubs.sql                    # Tabla clubs (tenant root)
003_create_personal.sql                 # Tabla personal (usuarios)
004_create_eventos.sql                  # Tabla eventos
005_create_invitados.sql                # Tabla invitados
006_create_functions.sql                # Funciones helper RLS
007_create_rls_policies.sql             # Políticas RLS iniciales
008_create_triggers.sql                 # Triggers de contadores
009_seed_data.sql                       # Datos de ejemplo (opcional)
010_create_storage_buckets.sql          # Storage buckets
```

### Fase 2: Features VIP, Realtime, Ubicaciones (011-015)
```
011_add_profile_image_to_invitados.sql  # Campo profile_image_url
012_enable_realtime.sql                 # Realtime eventos/invitados
013_create_vip_profiles_storage.sql     # Storage VIP profiles
014_create_ubicaciones.sql              # Catálogo de ubicaciones
015_update_invitados_ubicacion.sql      # Split ubicacion → departamento/localidad
```

### Fase 3: QR, Lotes, Ventas (016-018)
```
016_add_qr_to_invitados.sql             # QR codes únicos
017_create_lotes.sql                    # Tabla lotes con triggers
018_create_ventas.sql                   # Tabla ventas con validaciones
```

### Fase 4: Fixes RLS y Realtime (019-022)
```
019_fix_rls_policies_ubicacion.sql      # Fix RLS ubicaciones
020_fix_all_rls_policies.sql            # Fix general RLS
021_fix_rls_recursion.sql               # Fix recursión RLS
022_verify_and_fix_realtime.sql         # Verificar realtime
```

### Fase 5: Views y Contadores (023-027)
```
023_add_rrpp_counters_view.sql          # Vista eventos_rrpp_stats
024_prevent_delete_ingresados.sql       # Prevenir eliminar ingresados
025_fix_counters_complete.sql           # Fix completo de contadores
026_recreate_trigger_functions.sql      # Recrear triggers con SECURITY DEFINER
027_fix_eventos_rrpp_stats.sql          # Fix vista RRPP stats
```

### Fase 6: Ubicaciones y Comisiones (028-030)
```
028_add_iguazu_localidades.sql          # Agregar localidades de Iguazú
029_add_comision_rrpp_to_lotes.sql      # Comisiones RRPP + vista ventas_rrpp_stats
030_update_ventas_rrpp_stats_add_vip.sql # Agregar es_vip a vista ventas
```

### Fase 7: Grupos y Validaciones (031-035)
```
031_add_grupos_to_personal_and_lotes.sql           # Sistema de grupos A,B,C,D
032_fix_ventas_update_policy.sql                   # Fix política UPDATE ventas
033_add_fecha_cumpleanos_and_admin_update_policy.sql # Fecha cumpleaños
034_add_lote_activo_policy_and_validation.sql      # Validación lotes activos
035_enable_realtime_lotes.sql                      # Realtime en lotes
```

### Fase 8: Fixes Finales (036-041)
```
036_fix_rrpp_view_inactive_lotes.sql    # RRPP ve lotes inactivos en ventas
037_prevent_edit_ingresados_and_allow_rrpp_delete_ventas.sql # Validaciones ingresados
038_create_auth_logs.sql                # Tabla auth_logs (audit logging)
039_fix_admin_view_all_grupos.sql       # Admin ve todos los grupos
040_fix_security_definer_views_and_enable_rls_ubicaciones.sql # Fix SECURITY DEFINER + RLS ubicaciones
041_add_acreditacion_fields_to_ventas.sql # Campos acreditación ventas
```

## ⚠️ Notas Importantes

### Antes de Ejecutar
1. **Backup de la base de datos** si ya tienes datos
2. Verificar que tienes permisos de administrador en Supabase
3. Ejecutar scripts **uno por uno** en el SQL Editor de Supabase
4. Verificar que cada script se ejecute sin errores antes de continuar

### Dependencias Críticas
- **Script 009** (seed_data) es **opcional** - solo para datos de ejemplo
- **Scripts 016-018** (QR, lotes, ventas) son **requeridos** para la funcionalidad completa
- **Script 031** (grupos) agrega el sistema de grupos A,B,C,D
- **Script 040** (security definer) **corrige los 3 errores del linter de Supabase**

### Si ya tienes la base de datos creada
- Puedes ejecutar solo los scripts que faltan
- Verifica qué migraciones ya ejecutaste comparando con los scripts originales
- Si hay conflictos, revisa el contenido de cada script antes de ejecutar

### Scripts de Mantenimiento (Opcionales)
Estos scripts **NO** están incluidos pero pueden ser útiles:
- `019_recalculate_counters.sql` - Recalcular contadores manualmente
- `023_force_recalculate_now.sql` - Forzar recálculo de contadores
- `026_debug_and_fix_rrpp_view.sql` - Queries de debug

## 🔍 Verificación Post-Instalación

Después de ejecutar todos los scripts, verificar:

```sql
-- 1. Verificar que todas las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 3. Verificar triggers de contadores
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public';

-- 4. Verificar vistas
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';

-- 5. Verificar que no hay errores del linter
-- Ejecutar en Supabase Dashboard: Database → Linter
```

## ✅ Resultado Esperado

Después de ejecutar todos los scripts deberías tener:

### Tablas (11):
- clubs
- personal
- eventos
- invitados
- lotes
- ventas
- ubicaciones
- auth_logs

### Vistas (2):
- eventos_rrpp_stats
- ventas_rrpp_stats

### Storage Buckets (2):
- event-banners
- vip-profiles

### Enums (4):
- user_role (admin, rrpp, seguridad)
- sexo_type (hombre, mujer)
- grupo_type (A, B, C, D)
- metodo_pago_type (efectivo, transferencia, mixto)

### Funciones RLS:
- get_current_user_club()
- get_current_user_role()
- get_current_user_grupo()
- check_user_has_role()
- check_lote_grupo_match()

### Sin Errores de Linter:
- ✅ Security Definer Views corregidos
- ✅ RLS habilitado en todas las tablas públicas
- ✅ Políticas RLS configuradas correctamente

## 📚 Documentación Adicional

- **Esquema completo**: Ver `supabase/README.md` en el directorio principal
- **Seguridad**: Ver `SECURITY.md` para detalles de autenticación y audit logging
- **Instrucciones del proyecto**: Ver `CLAUDE.md` para contexto general

## 🐛 Troubleshooting

### Error: "relation already exists"
- El script ya fue ejecutado previamente
- Verifica qué migraciones ya aplicaste y continúa desde ahí

### Error: "column already exists"
- Similar al anterior, salta ese script y continúa

### Error: "violates foreign key constraint"
- Verifica que ejecutaste los scripts en orden
- Algunas tablas dependen de otras (ej: invitados depende de eventos)

### Error de permisos
- Asegúrate de estar conectado como propietario de la base de datos
- Algunos triggers requieren `SECURITY DEFINER`

---

**Última actualización**: 2024-12-18
**Total de scripts**: 41
**Scripts removidos**: 3 (debug/maintenance)
**Scripts consolidados**: 7 (versiones iterativas)
