# Checklist de Instalación - Sistema de Mesas

## Pre-requisitos

- [ ] Acceso al Supabase Dashboard del proyecto
- [ ] Rol de administrador en la base de datos
- [ ] Base de datos con migraciones 001-060 ya aplicadas
- [ ] Backup de la base de datos (por precaución)

## Instalación Paso a Paso

### Paso 1: Preparación
- [ ] Leer `RESUMEN_EJECUTIVO.md` para entender el sistema
- [ ] Leer `README.md` para detalles técnicos
- [ ] Verificar que no hay usuarios activos modificando datos (horario de mantenimiento)

### Paso 2: Ejecución de Migraciones (Orden Estricto)

**IMPORTANTE**: Ejecutar en el SQL Editor de Supabase Dashboard en orden numérico.

#### Migración 061 - Bartender Role
- [ ] Abrir `061_create_bartender_role.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensaje: "✅ Migration 061 successful: bartender role added"
- [ ] Si hay error, detener y revisar

**Nota**: Esta migración debe ejecutarse sola, no en transacción con otras.

#### Migración 062 - Sectores Table
- [ ] Abrir `062_create_sectores_table.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensajes de éxito (tabla, RLS, policies, storage bucket)
- [ ] Si hay error, detener y revisar

#### Migración 063 - Mesas Table
- [ ] Abrir `063_create_mesas_table.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensajes de éxito (tabla, enum, RLS, triggers)
- [ ] Si hay error, detener y revisar

#### Migración 064 - Ventas y Escaneos
- [ ] Abrir `064_create_mesas_ventas.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensajes de éxito (2 tablas, enum, RLS)
- [ ] Si hay error, detener y revisar

#### Migración 065 - Triggers
- [ ] Abrir `065_create_mesas_triggers.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensajes de éxito (triggers y funciones)
- [ ] Si hay error, detener y revisar

#### Migración 066 - Funciones RPC
- [ ] Abrir `066_create_mesas_functions.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensaje: "✅ All RPC functions created successfully"
- [ ] Si hay error, detener y revisar

#### Migración 067 - Realtime
- [ ] Abrir `067_enable_realtime_mesas.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensaje: "✅ Migration 067 completed successfully - All tables have realtime enabled"
- [ ] Si hay error, detener y revisar

#### Migración 068 - Sectores-Seguridad Assignment
- [ ] Abrir `068_create_sectores_seguridad_assignment.sql`
- [ ] Copiar y pegar en SQL Editor
- [ ] Ejecutar
- [ ] Verificar mensaje: "✅ Migration 068 completed successfully"
- [ ] Si hay error, detener y revisar

### Paso 3: Verificación Post-Instalación

#### Verificación Rápida (Automática)
- [ ] Ejecutar el DO block final de `TEST_QUERIES.sql` (línea ~620)
- [ ] Debe mostrar: "✅ TODAS LAS VERIFICACIONES PASARON"
- [ ] Si hay warnings, revisar qué componente falta

#### Verificación Detallada (Manual)

**Tablas**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');
```
- [ ] 5 tablas encontradas

**Enums**:
```sql
SELECT typname FROM pg_type
WHERE typname IN ('estado_mesa_type', 'tipo_escaneo_mesa');

SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
```
- [ ] 2 enums encontrados
- [ ] bartender aparece en user_role

**RLS**:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');
```
- [ ] Todas las tablas tienen rowsecurity = true

**Funciones RPC**:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%mesa%'
ORDER BY routine_name;
```
- [ ] Al menos 8 funciones encontradas

**Realtime**:
```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas');
```
- [ ] 4 tablas en realtime

**Storage**:
```sql
SELECT * FROM storage.buckets WHERE id = 'sectores-imagenes';
```
- [ ] Bucket existe

### Paso 4: Datos de Prueba (Opcional)

#### Crear Personal de Prueba
- [ ] Crear usuario bartender en Authentication
- [ ] Crear registro en `personal` con rol='bartender'
- [ ] Verificar login funciona

#### Crear Datos de Prueba
- [ ] Crear sector de prueba
- [ ] Crear 2-3 mesas en el sector
- [ ] Asignar seguridad al sector

#### Probar Flujos
- [ ] RRPP reserva mesa
- [ ] RRPP libera reserva
- [ ] RRPP vende mesa (verifica QR generado)
- [ ] Seguridad escanea QR (verifica ubicación mostrada)
- [ ] Bartender escanea QR (verifica consumición)
- [ ] Bartender marca entregado
- [ ] Intentar re-escanear (debe fallar)

### Paso 5: Frontend (Preparación)

#### Actualizar Tipos TypeScript
- [ ] Copiar tipos de `README.md` sección "Tipos TypeScript"
- [ ] Agregar a `src/types/database.ts`
- [ ] Verificar compilación sin errores

#### Crear Servicios
- [ ] Crear `src/services/sectores.service.ts`
- [ ] Crear `src/services/mesas.service.ts`
- [ ] Crear `src/services/ventas-mesas.service.ts`

#### Actualizar Navegación
- [ ] Agregar "Mesas" a menú de Admin
- [ ] Agregar "Mesas" a menú de RRPP
- [ ] Agregar "Escanear Mesas" a menú de Seguridad
- [ ] Agregar panel de Bartender

### Paso 6: Configuración de Permisos

#### Roles en Personal
- [ ] Verificar usuarios admin tienen rol correcto
- [ ] Verificar usuarios rrpp tienen rol correcto
- [ ] Verificar usuarios seguridad tienen rol correcto
- [ ] Crear usuarios bartender con rol correcto

#### RLS Testing
- [ ] Admin puede ver todas las mesas
- [ ] RRPP puede ver solo sus mesas vendidas/reservadas
- [ ] Seguridad puede escanear solo sectores asignados
- [ ] Bartender puede escanear cualquier mesa con consumición

### Paso 7: Monitoreo y Performance

#### Índices
```sql
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');
```
- [ ] Verificar que existen índices en FK

#### Estadísticas Iniciales
```sql
SELECT tablename, n_live_tup FROM pg_stat_user_tables
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');
```
- [ ] Anotar conteos iniciales

### Paso 8: Documentación

- [ ] Guardar copia de este checklist completado
- [ ] Documentar cualquier problema encontrado
- [ ] Documentar soluciones aplicadas
- [ ] Actualizar wiki interna (si aplica)

### Paso 9: Capacitación

#### Personal Admin
- [ ] Cómo crear sectores
- [ ] Cómo subir imágenes de planos
- [ ] Cómo crear mesas con coordenadas
- [ ] Cómo asignar seguridad a sectores

#### Personal RRPP
- [ ] Cómo reservar mesas
- [ ] Cómo vender mesas
- [ ] Cómo generar y compartir QR
- [ ] Cómo ver comisiones

#### Personal Seguridad
- [ ] Cómo escanear QR de entrada
- [ ] Cómo interpretar el mapa de ubicación
- [ ] Qué hacer si se alcanza el límite

#### Personal Bartender
- [ ] Cómo escanear QR de consumición
- [ ] Cómo confirmar entrega
- [ ] Qué hacer si ya fue entregada

### Paso 10: Go Live

- [ ] Programar horario de lanzamiento
- [ ] Notificar a todo el personal
- [ ] Tener backup reciente
- [ ] Tener plan de rollback preparado
- [ ] Monitorear logs en las primeras horas
- [ ] Estar disponible para soporte

## Rollback Plan

Si algo sale mal durante la instalación:

### Rollback Parcial (Solo última migración)
1. Des-comentar sección ROLLBACK del script que falló
2. Ejecutar en SQL Editor
3. Revisar el error
4. Corregir y volver a intentar

### Rollback Completo (Todo el sistema)
1. Ejecutar rollbacks en orden inverso (068 → 061)
2. Restaurar backup de base de datos
3. Revisar logs de error
4. Reportar al equipo técnico

**NOTA**: El rollback del enum bartender (061) es complejo. Evitar si es posible.

## Contactos de Soporte

- **DBA**: [Contacto]
- **DevOps**: [Contacto]
- **Frontend Lead**: [Contacto]
- **Product Owner**: [Contacto]

## Notas Adicionales

### Tiempo Estimado de Instalación
- Migraciones: 15-20 minutos
- Verificación: 10 minutos
- Datos de prueba: 15 minutos
- Testing: 30 minutos
- **Total**: ~1.5 horas

### Requisitos de Sistema
- PostgreSQL 14+
- Supabase Realtime habilitado
- Storage habilitado

### Compatibilidad
- Compatible con migraciones 001-060 existentes
- No rompe funcionalidad actual
- Tablas nuevas, no modifica existentes (excepto enum en 061)

## Checklist Final

- [ ] Todas las migraciones ejecutadas exitosamente
- [ ] Todas las verificaciones pasaron
- [ ] Datos de prueba creados y probados
- [ ] Frontend preparado (tipos, servicios)
- [ ] Personal capacitado
- [ ] Documentación actualizada
- [ ] Plan de rollback listo
- [ ] Monitoreo configurado

---

**Firma de Aprobación**:
- Ejecutado por: ___________________
- Fecha: ___________________
- Hora: ___________________
- Resultado: [ ] Exitoso [ ] Con problemas (detallar abajo)

**Problemas Encontrados**:
```
[Espacio para notas]
```

**Soluciones Aplicadas**:
```
[Espacio para notas]
```
