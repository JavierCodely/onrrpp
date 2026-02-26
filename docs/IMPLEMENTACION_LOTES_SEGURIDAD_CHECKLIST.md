# Checklist de Implementación: Sistema de Asignación de Seguridad a Lotes

**Fecha de inicio**: _________
**Responsable**: _________
**Versión migraciones**: 057-058

---

## Fase 1: Base de Datos (CRÍTICO - Ejecutar Primero)

### 1.1 Preparación
- [ ] Hacer backup completo de la base de datos de producción
- [ ] Verificar que no hay eventos activos en este momento (opcional, pero recomendado)
- [ ] Identificar UUIDs de lotes y seguridad para asignaciones iniciales
- [ ] Revisar el contenido de las migraciones 057 y 058

### 1.2 Ejecución de Migración 057
- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Copiar contenido completo de `057_create_lotes_seguridad_assignment.sql`
- [ ] Ejecutar migración
- [ ] Verificar resultado: ✅ Success (no errores)
- [ ] Ejecutar queries de verificación (SECTION 6 del archivo de migración):
  - [ ] Tabla `lotes_seguridad` existe
  - [ ] RLS habilitado
  - [ ] 4 políticas RLS creadas (SELECT, INSERT, UPDATE, DELETE)
  - [ ] Función `check_seguridad_can_scan` existe
  - [ ] Función `validate_lotes_seguridad_role` existe
  - [ ] Triggers creados (2 triggers)
  - [ ] Índices creados (2 índices)

### 1.3 Ejecución de Migración 058
- [ ] Copiar contenido completo de `058_integrate_lotes_seguridad_with_scan_functions.sql`
- [ ] Ejecutar migración
- [ ] Verificar resultado: ✅ Success (no errores)
- [ ] Ejecutar queries de verificación:
  - [ ] Función `rechazar_invitado` actualizada
  - [ ] Función `marcar_ingreso` creada
  - [ ] Función `get_my_assigned_lotes` creada
  - [ ] Vista `seguridad_lotes_asignados` creada

### 1.4 Testing de Base de Datos
- [ ] Ejecutar queries de `057_058_TEST_QUERIES.sql` - SECTION 1 (Verification)
- [ ] Crear una asignación de prueba (como admin):
  ```sql
  INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
  VALUES ('uuid-lote-test', 'uuid-seguridad-test');
  ```
- [ ] Verificar que la asignación aparece en `seguridad_lotes_asignados`
- [ ] Intentar asignar un usuario no-seguridad → debe fallar ✅
- [ ] Intentar asignar seguridad de otro club → debe fallar ✅
- [ ] Eliminar asignación de prueba

### 1.5 Asignaciones Iniciales (Producción)
- [ ] Listar todos los lotes activos:
  ```sql
  SELECT l.id, l.nombre, e.nombre as evento
  FROM public.lotes l
  JOIN public.eventos e ON l.uuid_evento = e.id
  WHERE l.activo = true AND e.estado = true;
  ```
- [ ] Listar todo el personal de seguridad activo:
  ```sql
  SELECT id, apellido, nombre
  FROM public.personal
  WHERE rol = 'seguridad' AND activo = true;
  ```
- [ ] Crear asignaciones para eventos activos:
  ```sql
  -- Repetir para cada lote-seguridad necesario
  INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
  VALUES ('uuid-lote', 'uuid-seguridad');
  ```
- [ ] Verificar asignaciones creadas:
  ```sql
  SELECT * FROM public.seguridad_lotes_asignados
  ORDER BY evento_nombre, lote_nombre;
  ```

**Resultado Fase 1**: Base de datos lista ✅

---

## Fase 2: Código Frontend - Actualización Crítica (PRIORITARIO)

### 2.1 Actualizar Tipos TypeScript
- [ ] Verificar que `src/types/database.ts` tiene las nuevas interfaces:
  - [ ] `LoteSeguridad`
  - [ ] `SeguridadLoteAsignado`
  - [ ] `MyAssignedLote`
- [ ] Si no existen, copiar desde el archivo generado

### 2.2 Agregar Servicio de Lotes-Seguridad
- [ ] Copiar `src/services/lotes-seguridad.service.ts` al proyecto
- [ ] Verificar que el import de `supabase` es correcto
- [ ] Verificar que los tipos importados están correctos

### 2.3 Actualizar Scanner Page (CRÍTICO)
**Archivo**: `src/components/pages/seguridad/ScannerPage.tsx`

**Cambios necesarios**:

- [ ] Importar servicio:
  ```typescript
  import { marcarIngreso, checkSeguridadCanScan } from '@/services/lotes-seguridad.service'
  ```

- [ ] REEMPLAZAR llamada directa a Supabase UPDATE por función RPC:
  ```typescript
  // ❌ ANTES (eliminar):
  const { error } = await supabase
    .from('invitados')
    .update({ ingresado: true, fecha_ingreso: new Date().toISOString() })
    .eq('qr_code', qrCode)

  // ✅ AHORA (usar):
  const result = await marcarIngreso(qrCode)

  if (!result.success) {
    // Manejar diferentes tipos de errores
    if (result.error?.includes('pertenece al')) {
      toast.error(result.error) // Muestra: "Este cliente pertenece al VIP Gold"
    } else if (result.already_ingresado) {
      toast.warning('Este invitado ya ha ingresado')
    } else {
      toast.error(result.error || 'Error al marcar ingreso')
    }
    return
  }

  toast.success('Ingreso registrado')
  ```

- [ ] Actualizar manejo de errores para mostrar nombre de lote
- [ ] Probar scanner con invitado asignado → debe funcionar ✅
- [ ] Probar scanner con invitado no asignado → debe mostrar error con nombre de lote ✅

### 2.4 Testing de Scanner (Seguridad)
- [ ] Login como seguridad en app
- [ ] Escanear QR de invitado en lote asignado → ✅ Success
- [ ] Escanear QR de invitado en lote NO asignado → ❌ Error con nombre de lote
- [ ] Escanear QR de invitado sin lote → ✅ Success (backward compatibility)
- [ ] Verificar que los counters se actualizan correctamente
- [ ] Verificar que realtime funciona

**Resultado Fase 2**: Scanner actualizado y funcional ✅

---

## Fase 3: UI de Admin - Gestión de Asignaciones (RECOMENDADO)

### 3.1 Crear Componente LoteSeguridadManager
- [ ] Crear archivo `src/components/organisms/LoteSeguridadManager.tsx`
- [ ] Copiar código de ejemplo desde `LOTES_SEGURIDAD_UI_EXAMPLES.md`
- [ ] Ajustar imports según estructura del proyecto
- [ ] Verificar que shadcn/ui components están instalados:
  - [ ] Dialog
  - [ ] Select
  - [ ] Button
  - [ ] Badge

### 3.2 Integrar en Página de Lotes (Admin)
**Opción A: Modal de Detalles de Lote**

- [ ] En el componente de detalle/edición de lote, añadir sección:
  ```tsx
  <LoteSeguridadManager
    uuidLote={lote.id}
    loteNombre={lote.nombre}
  />
  ```

**Opción B: Tab Separada**

- [ ] Añadir tab "Asignación Seguridad" en página de evento
- [ ] Mostrar componente para cada lote del evento

### 3.3 Testing de Gestión (Admin)
- [ ] Login como admin
- [ ] Ir a página de lotes
- [ ] Abrir gestión de seguridad para un lote
- [ ] Asignar un seguridad → ✅ Success
- [ ] Intentar asignar el mismo seguridad de nuevo → ❌ Error
- [ ] Ver lista de seguridades asignados → aparece correctamente
- [ ] Eliminar asignación → confirma y elimina
- [ ] Verificar que seguridad ya no puede escanear ese lote

**Resultado Fase 3**: Admin puede gestionar asignaciones desde UI ✅

---

## Fase 4: UI de Seguridad - Vista de Lotes Asignados (OPCIONAL)

### 4.1 Crear Componente MyAssignedLotes
- [ ] Crear archivo `src/components/organisms/MyAssignedLotes.tsx`
- [ ] Copiar código de ejemplo desde `LOTES_SEGURIDAD_UI_EXAMPLES.md`
- [ ] Ajustar estilos según diseño del proyecto

### 4.2 Integrar en Dashboard de Seguridad
- [ ] Añadir componente al inicio de `ScannerPage` o crear dashboard dedicado
- [ ] Mostrar cards con lotes asignados
- [ ] Mostrar información del evento y capacidad

### 4.3 Testing de Vista (Seguridad)
- [ ] Login como seguridad
- [ ] Ver dashboard → muestra lotes asignados
- [ ] Verificar información correcta (nombre lote, evento, capacidad)
- [ ] Si no tiene lotes asignados → muestra mensaje apropiado

**Resultado Fase 4**: Seguridad ve sus lotes asignados ✅

---

## Fase 5: Reportes y Monitoreo (OPCIONAL, POST-LANZAMIENTO)

### 5.1 Dashboard de Asignaciones
- [ ] Crear página admin para ver todas las asignaciones
- [ ] Usar componente `EventoSeguridadAssignments`
- [ ] Añadir filtros por evento, lote, seguridad

### 5.2 Reportes de Workload
- [ ] Implementar queries de `057_058_TEST_QUERIES.sql` - SECTION 7 (Statistics)
- [ ] Mostrar distribución de carga por seguridad
- [ ] Identificar lotes sin seguridad asignado
- [ ] Alertar si hay desbalance

### 5.3 Alertas y Notificaciones
- [ ] Alerta si evento activo tiene lotes sin seguridad
- [ ] Notificación a seguridad cuando se le asigna lote
- [ ] Notificación a admin si seguridad intenta escanear lote no asignado

**Resultado Fase 5**: Sistema de monitoreo completo ✅

---

## Verificación Final - Checklist de Producción

### Base de Datos
- [ ] Migraciones 057 y 058 ejecutadas sin errores
- [ ] Todas las tablas, funciones, vistas y triggers existen
- [ ] RLS habilitado y políticas funcionando
- [ ] Asignaciones iniciales creadas para eventos activos

### Frontend
- [ ] Tipos TypeScript actualizados
- [ ] Servicio de lotes-seguridad integrado
- [ ] Scanner usa `marcarIngreso()` en lugar de UPDATE directo
- [ ] Manejo de errores muestra nombre de lote
- [ ] UI de admin para gestionar asignaciones (si implementado)
- [ ] Vista de lotes asignados para seguridad (si implementado)

### Testing End-to-End
- [ ] **Como Admin**:
  - [ ] Puedo crear evento y lotes
  - [ ] Puedo asignar seguridad a lotes
  - [ ] Puedo ver todas las asignaciones
  - [ ] Puedo eliminar asignaciones
  - [ ] No puedo asignar usuarios no-seguridad
  - [ ] No puedo asignar seguridad de otro club

- [ ] **Como Seguridad Asignado**:
  - [ ] Veo mis lotes asignados
  - [ ] Puedo escanear invitados de mis lotes → ✅ Success
  - [ ] No puedo escanear invitados de otros lotes → ❌ Error claro
  - [ ] Puedo escanear invitados sin lote → ✅ Success
  - [ ] Puedo rechazar invitados de mis lotes
  - [ ] No puedo rechazar invitados de otros lotes

- [ ] **Como Seguridad NO Asignado**:
  - [ ] Veo mensaje de "sin lotes asignados"
  - [ ] Puedo escanear solo invitados sin lote

- [ ] **Como RRPP**:
  - [ ] No tengo acceso a gestión de asignaciones
  - [ ] Puedo crear invitados normalmente
  - [ ] Puedo asignar lote a invitados

### Performance
- [ ] Queries de escaneo responden en < 500ms
- [ ] Queries de asignaciones responden en < 1s
- [ ] Índices están siendo usados (verificar con EXPLAIN)
- [ ] No hay bloqueos de base de datos

### Documentación
- [ ] README actualizado con nueva funcionalidad
- [ ] Manual de usuario para admin (cómo asignar seguridad)
- [ ] Manual de usuario para seguridad (cómo ver lotes)
- [ ] Documentación técnica actualizada

### Rollback Plan
- [ ] Script de rollback probado en staging
- [ ] Backup de base de datos guardado
- [ ] Procedimiento de rollback documentado
- [ ] Equipo capacitado en cómo ejecutar rollback

---

## Post-Lanzamiento

### Semana 1
- [ ] Monitorear logs de errores relacionados con asignaciones
- [ ] Recopilar feedback de seguridad sobre la nueva funcionalidad
- [ ] Verificar que no hay lotes activos sin seguridad asignado
- [ ] Ajustar asignaciones según feedback operativo

### Semana 2-4
- [ ] Analizar métricas de uso
- [ ] Implementar mejoras UX si son necesarias
- [ ] Capacitar a nuevo personal en el sistema
- [ ] Documentar casos de uso y best practices

### Mes 2+
- [ ] Evaluar necesidad de features adicionales (notificaciones, reportes)
- [ ] Optimizar performance si es necesario
- [ ] Considerar expansión del sistema (más roles, más granularidad)

---

## Contactos y Recursos

**Migraciones SQL**:
- `supabase_script/supabase_scripts/057_create_lotes_seguridad_assignment.sql`
- `supabase_script/supabase_scripts/058_integrate_lotes_seguridad_with_scan_functions.sql`

**Documentación**:
- `057_058_LOTES_SEGURIDAD_README.md` - Documentación completa
- `057_058_RESUMEN_EJECUTIVO.md` - Resumen ejecutivo
- `LOTES_SEGURIDAD_UI_EXAMPLES.md` - Ejemplos de UI

**Código**:
- `src/services/lotes-seguridad.service.ts` - Servicio frontend
- `src/types/database.ts` - Tipos TypeScript

**Testing**:
- `057_058_TEST_QUERIES.sql` - Queries de prueba

**Rollback**:
- `057_058_ROLLBACK.sql` - Script de rollback completo

---

## Notas y Observaciones

_Espacio para notas durante la implementación_:

```
Fecha: __________
Notas:




Problemas encontrados:




Soluciones aplicadas:




```

---

**Checklist completado por**: _________
**Fecha de completitud**: _________
**Versión en producción**: _________
**Estado**: ⏳ En Progreso / ✅ Completado / ❌ Rollback Ejecutado
