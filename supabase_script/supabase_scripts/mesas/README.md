# Sistema de Gestión de Mesas - Migraciones SQL

## Descripción General

Sistema completo de gestión de mesas para nightclub con asignación visual de ubicaciones, tracking de escaneos diferenciados (seguridad vs bartender), gestión de consumiciones, y actualización en tiempo real.

## Arquitectura del Sistema

### Flujo de Datos

```
ADMIN
  └─> Crea SECTORES (áreas físicas con plano)
      └─> Crea MESAS dentro de sectores (con posición X/Y)
          └─> Asigna SEGURIDAD a sectores
              └─> Configura comisiones y consumiciones

RRPP
  └─> Ve sectores con plano visual
      └─> RESERVA mesa (bloqueo temporal, sin QR)
          └─> VENDE mesa (genera QR + venta registrada)

SEGURIDAD
  └─> Escanea QR de mesa
      └─> Valida sector asignado
          └─> Registra ingreso (hasta max_personas)
              └─> Muestra ubicación exacta en plano

BARTENDER
  └─> Escanea QR de mesa
      └─> Valida que tenga consumición
          └─> Muestra detalle de consumición
              └─> Marca como entregada (solo 1 vez)
```

### Tablas Principales

1. **sectores** - Áreas físicas del club (VIP, Terraza, etc.)
2. **mesas** - Mesas individuales con estado y posicionamiento
3. **ventas_mesas** - Registro de ventas con QR único
4. **escaneos_mesas** - Historial de escaneos (audit log)
5. **sectores_seguridad** - Asignación many-to-many seguridad ↔ sectores

### Estados de Mesa

- **libre**: Disponible para reserva/venta (🟢 verde)
- **reservado**: Bloqueada por RRPP sin venta (🟡 amarillo)
- **vendido**: Venta confirmada con QR (🔴 rojo)

## Orden de Ejecución

**IMPORTANTE**: Ejecutar las migraciones en orden numérico estricto.

```sql
-- 1. Agregar rol bartender al enum
061_create_bartender_role.sql

-- 2. Crear sectores (áreas físicas)
062_create_sectores_table.sql

-- 3. Crear mesas con todos los campos
063_create_mesas_table.sql

-- 4. Crear ventas y escaneos
064_create_mesas_ventas.sql

-- 5. Crear triggers automáticos
065_create_mesas_triggers.sql

-- 6. Crear funciones RPC de negocio
066_create_mesas_functions.sql

-- 7. Habilitar Realtime
067_enable_realtime_mesas.sql

-- 8. Crear asignación seguridad-sectores
068_create_sectores_seguridad_assignment.sql
```

## Migraciones Detalladas

### 061 - Create Bartender Role

**Objetivo**: Extender el enum `user_role` para incluir el rol `bartender`.

**Cambios**:
- Agrega `'bartender'` a `user_role` enum
- Actualiza comentario del enum

**Notas**: PostgreSQL no permite rollback fácil de enum values. Esta migración debe ejecutarse sola (no en transacción).

---

### 062 - Create Sectores Table

**Objetivo**: Crear tabla de sectores con storage bucket para imágenes de planos.

**Tablas Creadas**:
- `sectores` - Sectores físicos del club

**Storage Buckets**:
- `sectores-imagenes` - Almacena planos de sectores (público)

**Campos Principales**:
- `nombre` - Nombre del sector (ej: "VIP Principal")
- `imagen_url` - URL de la imagen del plano en storage
- `uuid_evento` - Evento al que pertenece
- `uuid_club` - Multi-tenant isolation

**RLS Policies**:
- SELECT: Todos los usuarios de su club
- INSERT/UPDATE/DELETE: Solo admins

---

### 063 - Create Mesas Table

**Objetivo**: Crear tabla de mesas con estado, pricing, y posicionamiento visual.

**Enums Creados**:
- `estado_mesa_type`: `libre`, `reservado`, `vendido`

**Tablas Creadas**:
- `mesas` - Mesas individuales dentro de sectores

**Campos Principales**:
- `nombre` - Nombre/número de mesa
- `estado` - Estado actual (enum)
- `precio` - Precio de la mesa
- `max_personas` - Límite de escaneos seguridad
- `escaneos_seguridad_count` - Contador actual
- `id_rrpp` - RRPP asignado (cuando reservado/vendido)
- `comision_tipo` / `comision_rrpp_monto` / `comision_rrpp_porcentaje` - Comisiones
- `tiene_consumicion` / `detalle_consumicion` - Consumición incluida
- `consumicion_entregada` / `id_bartender_entrega` - Estado de entrega
- `coordenada_x` / `coordenada_y` - Posición visual (0-100%)

**Triggers**:
- `validate_mesa_state()` - Valida reglas de negocio y relaciones

**RLS Policies**:
- SELECT: Todos los usuarios de su club
- INSERT/DELETE: Solo admins
- UPDATE: Admins (todas) + RRPP (solo sus mesas)

**Constraints Importantes**:
- Mesa libre no puede tener RRPP
- Mesa reservada/vendida debe tener RRPP
- Mesa vendida debe tener comisión configurada
- Si tiene consumición, debe tener detalle
- Coordenadas deben estar entre 0-100

---

### 064 - Create Mesas Ventas

**Objetivo**: Crear tablas de ventas y historial de escaneos.

**Enums Creados**:
- `tipo_escaneo_mesa`: `seguridad`, `bartender`

**Tablas Creadas**:
- `ventas_mesas` - Registro de ventas con QR único (1:1 con mesa)
- `escaneos_mesas` - Historial inmutable de escaneos (audit log)

**Campos ventas_mesas**:
- `uuid_mesa` - Mesa vendida (UNIQUE, solo 1 venta por mesa)
- `cliente_dni` / `cliente_nombre` / `cliente_email` - Datos del comprador
- `precio_venta` - Precio de venta (puede diferir del precio base)
- `comision_calculada` - Comisión final calculada
- `qr_code` - QR único generado (formato: MESA-{uuid}-{timestamp})

**Campos escaneos_mesas**:
- `uuid_mesa` / `uuid_venta_mesa` - Referencias
- `tipo_escaneo` - seguridad o bartender
- `id_personal` / `nombre_personal` / `rol_personal` - Quien escaneó
- `qr_code_escaneado` - QR que fue escaneado
- `created_at` - Timestamp del escaneo

**Triggers**:
- `validate_venta_mesa()` - Calcula comisión y valida club
- `validate_escaneo_mesa()` - Valida tipo de escaneo vs rol

**RLS Policies**:
- ventas_mesas: SELECT (todos), INSERT (RRPP/admin), UPDATE/DELETE (admin)
- escaneos_mesas: SELECT (todos), INSERT (seguridad/bartender), NO UPDATE/DELETE

**Notas**: escaneos_mesas es inmutable (audit log), no se pueden modificar ni eliminar registros.

---

### 065 - Create Mesas Triggers

**Objetivo**: Triggers automáticos para mantener consistencia y validar límites.

**Triggers Creados**:

1. **increment_escaneos_seguridad()**
   - Incrementa contador al insertar escaneo tipo seguridad
   - Valida que no se exceda max_personas

2. **prevent_duplicate_bartender_scan()**
   - Bloquea re-escaneo de bartender
   - Valida que la mesa tenga consumición
   - Verifica que no esté ya entregada

3. **update_mesa_on_venta_created()**
   - Cambia estado de mesa a `vendido` al crear venta
   - Copia comisiones de mesa a venta

4. **prevent_venta_mesa_deletion_with_scans()**
   - Previene eliminar ventas que tienen escaneos
   - Protege integridad del audit log

5. **reset_mesa_on_venta_deleted()**
   - Resetea mesa a `libre` cuando se elimina venta
   - Solo ejecuta si no hay escaneos (trigger anterior protege)

6. **prevent_estado_change_with_venta()**
   - Previene cambiar estado a libre si existe venta activa
   - Debe eliminar venta primero

**Función Helper**:
- `get_mesa_escaneos_count(uuid_mesa, tipo)` - Retorna conteo de escaneos

---

### 066 - Create Mesas Functions

**Objetivo**: Funciones RPC para la lógica de negocio principal.

**Funciones Creadas**:

1. **escanear_mesa_seguridad(qr_code, solo_verificar)**
   - Seguridad escanea QR para validar y registrar ingreso
   - `solo_verificar=true`: Solo valida sin crear escaneo
   - Valida sector asignado (si existe sectores_seguridad)
   - Verifica límite de personas
   - Retorna ubicación exacta de la mesa (coordenadas + imagen)
   - Crea registro en escaneos_mesas (trigger incrementa contador)

2. **escanear_mesa_bartender(qr_code, marcar_entregado)**
   - Bartender escanea QR para entregar consumición
   - `marcar_entregado=false`: Solo muestra info (confirmación)
   - `marcar_entregado=true`: Marca como entregada
   - Valida que tenga consumición
   - Valida que no esté ya entregada
   - Crea registro en escaneos_mesas
   - Actualiza mesa: consumicion_entregada=true

3. **reservar_mesa(uuid_mesa)**
   - RRPP reserva mesa (sin venta)
   - Cambia estado a `reservado`
   - Asigna id_rrpp
   - No genera QR ni registra comisión

4. **liberar_reserva_mesa(uuid_mesa)**
   - RRPP o Admin libera reserva
   - Cambia estado a `libre`
   - RRPP solo puede liberar sus propias reservas
   - Admin puede liberar cualquier reserva

5. **vender_mesa(uuid_mesa, cliente_dni, cliente_nombre, cliente_email, precio_venta)**
   - RRPP vende mesa
   - Valida que esté libre o reservada por el mismo RRPP
   - Valida que tenga comisión configurada
   - Genera QR único
   - Crea registro en ventas_mesas (trigger cambia estado a vendido)
   - Retorna venta_id y qr_code

---

### 067 - Enable Realtime Mesas

**Objetivo**: Habilitar Supabase Realtime para actualizaciones en vivo.

**Tablas con Realtime**:
- `sectores`
- `mesas`
- `ventas_mesas`
- `escaneos_mesas`

**Configuración**:
- Agregadas a publication `supabase_realtime`
- Replica identity set to FULL (trackea todos los cambios)

**Casos de Uso**:
- Admin: Ver cambios en mesas en tiempo real
- RRPP: Ver cuando sus mesas son escaneadas
- Seguridad: Ver ingresos en vivo
- Bartender: Ver consumiciones entregadas
- Visual Map: Actualizar círculos de colores instantáneamente

**Ejemplos de Código**: Ver comentarios en el archivo SQL.

---

### 068 - Create Sectores Seguridad Assignment

**Objetivo**: Sistema many-to-many para asignar seguridad a sectores.

**Tablas Creadas**:
- `sectores_seguridad` - Junction table (asignaciones)

**Views Creadas**:
- `seguridad_sectores_asignados` - Vista con detalles de asignaciones

**Funciones RPC**:

1. **get_my_assigned_sectores()**
   - Seguridad ve sus sectores asignados
   - Retorna con conteo de mesas por sector

2. **get_seguridad_by_sector(uuid_sector)**
   - Lista todo el personal asignado a un sector

3. **assign_seguridad_to_sector(uuid_sector, seguridad_ids[])**
   - Admin asigna múltiples seguridad a un sector (bulk)
   - Idempotente (ON CONFLICT DO NOTHING)

**Validaciones**:
- Solo personal con rol seguridad puede ser asignado
- Seguridad y sector deben pertenecer al mismo club
- Constraint UNIQUE(uuid_sector, id_seguridad)

**RLS Policies**:
- SELECT: Todos los usuarios de su club
- INSERT/UPDATE/DELETE: Solo admins

**Integración con escanear_mesa_seguridad()**:
- Si existen asignaciones para el sector, valida que el seguridad esté asignado
- Si no hay asignaciones, cualquier seguridad puede escanear (backward compatibility)

---

## Patrones de Diseño Utilizados

### Multi-Tenant Isolation
Todas las tablas tienen `uuid_club` y RLS policies que filtran por `get_current_user_club()`.

### SECURITY DEFINER
Triggers y funciones críticas usan `SECURITY DEFINER` para bypass RLS cuando es necesario (validaciones, contadores).

### Audit Log Inmutable
La tabla `escaneos_mesas` no tiene policies de UPDATE/DELETE, funciona como log de auditoría permanente.

### Estado Consistente
Triggers garantizan que:
- Mesa vendida siempre tiene venta
- Venta eliminada resetea mesa a libre
- Contadores siempre sincronizados

### Idempotencia
Funciones RPC retornan JSON con `success: true/false` para manejo de errores consistente.

## Verificación Post-Migración

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');

-- Verificar enums
SELECT typname FROM pg_type
WHERE typname IN ('estado_mesa_type', 'tipo_escaneo_mesa');

-- Verificar RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad');

-- Verificar policies
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
GROUP BY tablename;

-- Verificar triggers
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE event_object_table IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
ORDER BY event_object_table, trigger_name;

-- Verificar funciones RPC
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%mesa%'
ORDER BY routine_name;

-- Verificar Realtime
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas');

-- Verificar storage bucket
SELECT * FROM storage.buckets WHERE id = 'sectores-imagenes';
```

## Flujo de Uso Típico

### 1. Setup Inicial (Admin)

```sql
-- Crear sector
INSERT INTO sectores (nombre, uuid_evento, uuid_club, imagen_url)
VALUES ('VIP Principal', 'evento-uuid', 'club-uuid', 'https://...');

-- Crear mesas en el sector
INSERT INTO mesas (
    nombre, uuid_sector, uuid_evento, uuid_club,
    estado, precio, max_personas,
    comision_tipo, comision_rrpp_porcentaje,
    tiene_consumicion, monto_consumicion, detalle_consumicion,
    coordenada_x, coordenada_y
) VALUES
    ('Mesa VIP-1', 'sector-uuid', 'evento-uuid', 'club-uuid',
     'libre', 50000, 6,
     'porcentaje', 15,
     true, 30000, '1 botella vodka Absolut + mixers',
     25.5, 30.0),
    ('Mesa VIP-2', 'sector-uuid', 'evento-uuid', 'club-uuid',
     'libre', 50000, 6,
     'porcentaje', 15,
     true, 30000, '1 botella vodka Absolut + mixers',
     75.0, 30.0);

-- Asignar seguridad al sector
SELECT assign_seguridad_to_sector(
    'sector-uuid',
    ARRAY['seguridad-1-uuid', 'seguridad-2-uuid']::UUID[]
);
```

### 2. Venta (RRPP)

```typescript
// Frontend: RRPP vende mesa
const { data, error } = await supabase.rpc('vender_mesa', {
  p_uuid_mesa: 'mesa-uuid',
  p_cliente_dni: '12345678',
  p_cliente_nombre: 'Juan Pérez',
  p_cliente_email: 'juan@example.com',
  p_precio_venta: 50000 // Opcional, usa precio de mesa si no se especifica
})

if (data.success) {
  console.log('QR Code:', data.qr_code)
  // Mostrar/enviar QR al cliente
}
```

### 3. Escaneo Seguridad

```typescript
// Frontend: Seguridad escanea QR
const { data, error } = await supabase.rpc('escanear_mesa_seguridad', {
  p_qr_code: qrCodeScanned,
  p_solo_verificar: false
})

if (data.success) {
  // Mostrar ubicación de la mesa
  console.log('Mesa:', data.mesa_nombre)
  console.log('Sector:', data.sector_nombre)
  console.log('Imagen:', data.sector_imagen_url)
  console.log('Posición:', data.coordenada_x, data.coordenada_y)
  console.log('Personas:', data.escaneos_actuales, '/', data.max_personas)
}
```

### 4. Entrega Consumición (Bartender)

```typescript
// Frontend: Bartender escanea QR (paso 1: ver detalle)
const { data } = await supabase.rpc('escanear_mesa_bartender', {
  p_qr_code: qrCodeScanned,
  p_marcar_entregado: false
})

if (data.success && data.mostrar_confirmacion) {
  // Mostrar modal con detalle
  console.log('Mesa:', data.mesa_nombre)
  console.log('Consumición:', data.detalle_consumicion)

  // Usuario confirma entrega
  const { data: confirmar } = await supabase.rpc('escanear_mesa_bartender', {
    p_qr_code: qrCodeScanned,
    p_marcar_entregado: true
  })

  if (confirmar.success) {
    console.log('Consumición entregada exitosamente')
  }
}
```

## Tipos TypeScript

Agregar a `src/types/database.ts`:

```typescript
export type EstadoMesa = 'libre' | 'reservado' | 'vendido'
export type TipoEscaneoMesa = 'seguridad' | 'bartender'

export interface Sector {
  id: string
  nombre: string
  imagen_url: string | null
  uuid_evento: string
  uuid_club: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Mesa {
  id: string
  nombre: string
  uuid_sector: string
  uuid_evento: string
  uuid_club: string
  estado: EstadoMesa
  precio: number
  max_personas: number
  escaneos_seguridad_count: number
  id_rrpp: string | null
  comision_tipo: ComisionTipo | null
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  tiene_consumicion: boolean
  monto_consumicion: number
  detalle_consumicion: string | null
  consumicion_entregada: boolean
  id_bartender_entrega: string | null
  fecha_entrega_consumicion: string | null
  coordenada_x: number
  coordenada_y: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface VentaMesa {
  id: string
  uuid_mesa: string
  uuid_evento: string
  uuid_club: string
  id_rrpp: string
  cliente_dni: string
  cliente_nombre: string | null
  cliente_email: string | null
  precio_venta: number
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  comision_calculada: number
  qr_code: string
  created_at: string
  updated_at: string
}

export interface EscaneoMesa {
  id: string
  uuid_mesa: string
  uuid_venta_mesa: string
  tipo_escaneo: TipoEscaneoMesa
  id_personal: string
  nombre_personal: string
  rol_personal: UserRole
  qr_code_escaneado: string
  created_at: string
}

export interface SectorSeguridad {
  id: string
  uuid_sector: string
  id_seguridad: string
  created_at: string
  updated_at: string
}
```

## Troubleshooting

### Error: "El personal especificado no existe o está inactivo"
- Verificar que el usuario tenga registro en tabla `personal`
- Verificar que `activo = true`
- Verificar que `uuid_club` coincida

### Error: "Solo personal con rol seguridad puede ser asignado"
- Al asignar seguridad a sectores, verificar que `rol = 'seguridad'`
- El enum bartender debe existir (migración 061)

### Error: "Mesa completa: limite de X personas alcanzado"
- El contador `escaneos_seguridad_count` alcanzó `max_personas`
- Normal, es la funcionalidad esperada
- Admin puede editar `max_personas` si fue mal configurado

### Error: "La consumicion ya fue entregada"
- Bartender ya escaneó esta mesa anteriormente
- Comportamiento esperado, solo 1 escaneo por mesa
- Ver historial en tabla `escaneos_mesas`

### Realtime no funciona
- Verificar que las tablas estén en la publication:
  ```sql
  SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  ```
- Verificar RLS policies permiten SELECT al usuario
- Verificar en frontend que el canal esté subscribed

## Rollback

Los scripts incluyen secciones de ROLLBACK comentadas. Para revertir:

```sql
-- Ejecutar en orden inverso (068 -> 061)
-- Des-comentar secciones ROLLBACK de cada script
```

**ADVERTENCIA**: El rollback del enum bartender (061) es complejo y requiere:
1. Crear nuevo enum sin bartender
2. Alterar columnas para usar nuevo enum
3. Drop enum antiguo
4. Rename nuevo enum

Se recomienda NO hacer rollback de 061 una vez en producción.

## Consideraciones de Performance

- **Indexes**: Todas las FK tienen índices para joins rápidos
- **RLS**: Usar `get_current_user_club()` en vez de auth.uid() para mejor cacheo
- **Realtime**: Usar filtros específicos para reducir tráfico
- **Contadores**: Los triggers SECURITY DEFINER no causan problemas de concurrencia

## Próximos Pasos (Frontend)

1. Crear servicios TypeScript:
   - `src/services/sectores.service.ts`
   - `src/services/mesas.service.ts`
   - `src/services/ventas-mesas.service.ts`

2. Crear componentes:
   - `SectorMapView.tsx` - Vista visual del plano con círculos
   - `MesaFormDialog.tsx` - Crear/editar mesas
   - `VenderMesaDialog.tsx` - Formulario de venta
   - `ScannerMesaSeguridad.tsx` - Scanner para seguridad
   - `ScannerMesaBartender.tsx` - Scanner para bartender

3. Implementar Realtime:
   - Subscripciones a cambios de estado
   - Actualización automática de UI

## Soporte

Para dudas o problemas, contactar al equipo de desarrollo con:
- Logs de error completos
- Consulta SQL que falló
- Rol del usuario que ejecutó la acción
- Contexto del flujo (admin/rrpp/seguridad/bartender)
