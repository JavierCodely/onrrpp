# Orden de Ejecución de Migraciones Supabase

Este documento lista todas las migraciones en el orden correcto de ejecución.

## ⚠️ IMPORTANTE
- Ejecutar las migraciones **EN ORDEN NUMÉRICO**
- NO ejecutar archivos de debug/diagnóstico (marcados con ❌)
- Algunas migraciones del directorio `/update` ya fueron integradas en las principales

---

## 📦 Core Schema (001-010) - REQUERIDO

### 1. `001_create_enums.sql`
**Descripción**: Crea enums para roles (admin, rrpp, seguridad) y sexo (hombre, mujer)
**Dependencias**: Ninguna
**Ejecutar**: ✅ SÍ

### 2. `002_create_clubs.sql`
**Descripción**: Tabla de clubs (multi-tenant root)
**Dependencias**: 001
**Ejecutar**: ✅ SÍ

### 3. `003_create_personal.sql`
**Descripción**: Tabla de personal con integración a Supabase Auth
**Dependencias**: 001, 002
**Ejecutar**: ✅ SÍ

### 4. `004_create_eventos.sql`
**Descripción**: Tabla de eventos con contadores automáticos
**Dependencias**: 002, 003
**Ejecutar**: ✅ SÍ

### 5. `005_create_invitados.sql`
**Descripción**: Tabla de invitados con QR y validaciones
**Dependencias**: 003, 004
**Ejecutar**: ✅ SÍ

### 6. `006_create_functions.sql`
**Descripción**: Funciones helper para RLS (get_current_user_club, check_user_has_role)
**Dependencias**: 003
**Ejecutar**: ✅ SÍ

### 7. `007_create_rls_policies.sql`
**Descripción**: Políticas RLS para multi-tenant y permisos por rol
**Dependencias**: 006
**Ejecutar**: ✅ SÍ

### 8. `008_create_triggers.sql`
**Descripción**: Triggers para auto-incremento de contadores (total_invitados, total_ingresados)
**Dependencias**: 004, 005
**Ejecutar**: ✅ SÍ

### 9. `009_seed_data.sql`
**Descripción**: Datos de ejemplo (OPCIONAL)
**Dependencias**: 002
**Ejecutar**: ⚠️ OPCIONAL (solo para desarrollo/testing)

### 10. `010_create_storage_buckets.sql`
**Descripción**: Buckets de storage para banners de eventos
**Dependencias**: 002
**Ejecutar**: ✅ SÍ

---

## 🔄 Update Migrations (directorio /update) - LOTES Y VENTAS

### 11. `update/001_add_qr_to_invitados.sql`
**Descripción**: Agrega campo QR único a invitados
**Dependencias**: 005
**Ejecutar**: ✅ SÍ

### 12. `update/002_create_lotes.sql`
**Descripción**: Tabla de lotes (ticket batches) con triggers y RLS
**Dependencias**: 004, 005
**Ejecutar**: ✅ SÍ

### 13. `update/003_create_ventas.sql`
**Descripción**: Tabla de ventas con tracking de comisiones
**Dependencias**: update/002
**Ejecutar**: ✅ SÍ

### 14. `update/004_fix_lote_triggers.sql` a `update/010_fix_rls_recursion.sql`
**Descripción**: Fixes diversos para triggers y RLS de lotes
**Dependencias**: update/002
**Ejecutar**: ⚠️ SOLO SI HAY PROBLEMAS con lotes (iteraciones de debug)

---

## 🚀 Feature Additions (011+)

### 15. `011_enable_realtime.sql`
**Descripción**: Habilita Supabase Realtime en eventos e invitados
**Dependencias**: 004, 005
**Ejecutar**: ✅ SÍ

### 16. `011_add_profile_image_to_invitados.sql`
**Descripción**: Agrega campo profile_image_url para VIPs
**Dependencias**: 005
**Ejecutar**: ✅ SÍ

### 17. `012_create_vip_profiles_storage.sql`
**Descripción**: Bucket de storage para fotos de perfil VIP
**Dependencias**: 011 (profile_image)
**Ejecutar**: ✅ SÍ

### 18. `013_create_ubicaciones.sql`
**Descripción**: Tabla de departamentos/localidades de Argentina
**Dependencias**: Ninguna (tabla independiente)
**Ejecutar**: ✅ SÍ

### 19. `014_update_invitados_ubicacion.sql`
**Descripción**: Separa campo ubicacion en departamento + localidad
**Dependencias**: 005, 013
**Ejecutar**: ✅ SÍ

### 20. `015_fix_rls_policies_ubicacion.sql`
**Descripción**: Fix RLS tras cambio de ubicacion
**Dependencias**: 014
**Ejecutar**: ✅ SÍ

### 21. `016_fix_all_rls_policies.sql`
**Descripción**: Reescritura completa de políticas RLS
**Dependencias**: 007, 015
**Ejecutar**: ✅ SÍ (reemplaza 007 y 015)

### 22. `017_fix_rls_recursion.sql`
**Descripción**: Fix recursión en RLS policies
**Dependencias**: 016
**Ejecutar**: ✅ SÍ

### 23. `018_verify_and_fix_realtime.sql`
**Descripción**: Verifica y corrige configuración de Realtime
**Dependencias**: 011
**Ejecutar**: ✅ SÍ

### 24. `019_recalculate_counters.sql`
**Descripción**: Script para recalcular contadores manualmente
**Dependencias**: 004, 005, 008
**Ejecutar**: ⚠️ SOLO SI HAY DESINCRONIZACIÓN en contadores

### 25. `020_add_rrpp_counters_view.sql`
**Descripción**: Vista eventos_rrpp_stats para contadores por RRPP
**Dependencias**: 004, 005
**Ejecutar**: ✅ SÍ

### 26. `021_prevent_delete_ingresados.sql`
**Descripción**: Previene eliminación de invitados que ya ingresaron
**Dependencias**: 005
**Ejecutar**: ✅ SÍ

### 27. `022_fix_counters_complete.sql`
**Descripción**: Fix completo de triggers de contadores
**Dependencias**: 008, 019
**Ejecutar**: ⚠️ SOLO SI HAY PROBLEMAS con contadores

### 28. `023_force_recalculate_now.sql`
**Descripción**: Recalculo forzado de contadores (debug)
**Dependencias**: 019
**Ejecutar**: ❌ NO (solo para debug)

### 29. `024_recreate_trigger_functions.sql`
**Descripción**: Recrea triggers con SECURITY DEFINER
**Dependencias**: 008, 022
**Ejecutar**: ✅ SÍ (reemplaza 008 y 022)

### 30. `025_fix_eventos_rrpp_stats.sql`
**Descripción**: Fix vista eventos_rrpp_stats
**Dependencias**: 020
**Ejecutar**: ✅ SÍ

### 31. `026_debug_and_fix_rrpp_view.sql`
**Descripción**: Debug y fix de vista RRPP
**Dependencias**: 025
**Ejecutar**: ⚠️ SOLO SI HAY PROBLEMAS con vista eventos_rrpp_stats

### 32. `027_add_iguazu_localidades.sql`
**Descripción**: Agrega localidades de Iguazú a ubicaciones
**Dependencias**: 013
**Ejecutar**: ✅ SÍ (si operan en Iguazú)

### 33. `028_add_comision_rrpp_to_lotes.sql`
**Descripción**: Agrega campo comision_rrpp a lotes
**Dependencias**: update/002
**Ejecutar**: ✅ SÍ

### 34. `029_update_ventas_rrpp_stats_add_vip.sql`
**Descripción**: Actualiza vista de ventas incluyendo VIP
**Dependencies**: update/003
**Ejecutar**: ✅ SÍ

### 35. `update/029_add_acreditacion_fields_to_ventas.sql`
**Descripción**: Agrega campos de acreditación a ventas
**Dependencias**: update/003
**Ejecutar**: ✅ SÍ

---

## ❌ Archivos de Debug/Diagnóstico - NO EJECUTAR

- `DIAGNOSTICO_LOTES.sql` - Script de diagnóstico
- `DEBUG_LOTES.sql` - Script de debug
- `VERIFICAR_TRIGGERS.sql` - Script de verificación
- `apply_iguazu_migration.sql` - Script auxiliar de Iguazú

---

## 📋 Orden de Ejecución Recomendado (Setup Completo)

### Setup Inicial (Base de datos nueva):
```sql
-- Core Schema
001_create_enums.sql
002_create_clubs.sql
003_create_personal.sql
004_create_eventos.sql
005_create_invitados.sql
006_create_functions.sql
007_create_rls_policies.sql
008_create_triggers.sql
010_create_storage_buckets.sql

-- Lotes y Ventas
update/001_add_qr_to_invitados.sql
update/002_create_lotes.sql
update/003_create_ventas.sql

-- Features
011_enable_realtime.sql
011_add_profile_image_to_invitados.sql
012_create_vip_profiles_storage.sql
013_create_ubicaciones.sql
014_update_invitados_ubicacion.sql
016_fix_all_rls_policies.sql (reemplaza 007 y 015)
017_fix_rls_recursion.sql
018_verify_and_fix_realtime.sql
020_add_rrpp_counters_view.sql
021_prevent_delete_ingresados.sql
024_recreate_trigger_functions.sql (reemplaza 008)
025_fix_eventos_rrpp_stats.sql
027_add_iguazu_localidades.sql (opcional)
028_add_comision_rrpp_to_lotes.sql
029_update_ventas_rrpp_stats_add_vip.sql
update/029_add_acreditacion_fields_to_ventas.sql
```

### Troubleshooting (solo si hay problemas):
```sql
019_recalculate_counters.sql (si contadores desincronizados)
022_fix_counters_complete.sql (si problemas con triggers)
026_debug_and_fix_rrpp_view.sql (si problemas con vista RRPP)
```

---

## 🆕 Nueva Migración - Sistema de Grupos

### 36. `030_add_grupos_to_personal_and_lotes.sql`
**Descripción**: Agrega sistema de grupos (A, B, C, D) a personal y lotes
**Dependencias**: 003, update/002
**Ejecutar**: ✅ SÍ (NUEVA)

---

## 📝 Notas Importantes

1. **Migraciones duplicadas**: Algunos números están duplicados (ej: dos archivos `011_`). Ejecutar ambos en orden alfabético.

2. **Reemplazos**: Algunas migraciones reemplazan a otras anteriores:
   - `016_fix_all_rls_policies.sql` reemplaza a 007 y 015
   - `024_recreate_trigger_functions.sql` reemplaza a 008 y 022

3. **Orden de dependencias**: Siempre ejecutar en orden numérico. Si hay problemas, revisar la sección de Troubleshooting.

4. **Testing**: Después de ejecutar todas las migraciones, verificar:
   - Triggers funcionando (crear/eliminar invitado)
   - RLS funcionando (probar con diferentes roles)
   - Contadores sincronizados
   - Realtime activo

5. **Rollback**: No hay scripts de rollback. Hacer backup de la base de datos antes de ejecutar migraciones en producción.
