# Guía del Sistema de Ventas

## Descripción General

El sistema de ventas permite gestionar los pagos de los invitados cuando compran lotes que tienen precio. Soporta tres métodos de pago:

- **Efectivo**: Pago completo en efectivo
- **Transferencia**: Pago completo por transferencia
- **Mixto**: Parte en efectivo y parte en transferencia

## Estructura de la Base de Datos

### Tabla: `ventas`

```sql
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY,
    uuid_invitado UUID NOT NULL,      -- Invitado que realizó la compra
    uuid_evento UUID NOT NULL,         -- Evento al que pertenece
    uuid_lote UUID NOT NULL,           -- Lote comprado
    id_rrpp UUID NOT NULL,             -- RRPP que realizó la venta
    metodo_pago metodo_pago_type NOT NULL, -- 'efectivo', 'transferencia', 'mixto'
    monto_total DECIMAL(10, 2) NOT NULL,   -- Precio del lote
    monto_efectivo DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_transferencia DECIMAL(10, 2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Validaciones Automáticas

El sistema incluye triggers que validan:

1. **Pago en Efectivo**:
   - `monto_efectivo` = `monto_total`
   - `monto_transferencia` = 0

2. **Pago en Transferencia**:
   - `monto_transferencia` = `monto_total`
   - `monto_efectivo` = 0

3. **Pago Mixto**:
   - `monto_efectivo` > 0
   - `monto_transferencia` > 0
   - `monto_efectivo` + `monto_transferencia` = `monto_total`

### Permisos RLS

**RRPP**:
- Ver todas las ventas de eventos de su club
- Crear ventas solo para sus propios invitados
- Actualizar solo sus propias ventas

**Admin**:
- Ver todas las ventas de eventos de su club
- Crear ventas para cualquier invitado del club
- Actualizar cualquier venta del club
- Eliminar ventas

**Seguridad**:
- Solo ver ventas (no puede crear, modificar o eliminar)

## Uso del Servicio de Ventas

### Importar el servicio

```typescript
import { ventasService } from '@/services/ventas.service'
```

### Crear una venta

```typescript
// Pago en efectivo
const venta = await ventasService.createVenta({
  uuid_invitado: 'invitado-uuid',
  uuid_evento: 'evento-uuid',
  uuid_lote: 'lote-uuid',
  id_rrpp: 'rrpp-uuid',
  metodo_pago: 'efectivo',
  monto_total: 5000,
  monto_efectivo: 5000,
  monto_transferencia: 0,
  observaciones: 'Pago completo en efectivo'
})

// Pago en transferencia
const venta = await ventasService.createVenta({
  uuid_invitado: 'invitado-uuid',
  uuid_evento: 'evento-uuid',
  uuid_lote: 'lote-uuid',
  id_rrpp: 'rrpp-uuid',
  metodo_pago: 'transferencia',
  monto_total: 5000,
  monto_efectivo: 0,
  monto_transferencia: 5000,
  observaciones: 'Transferencia a cuenta XXX'
})

// Pago mixto
const venta = await ventasService.createVenta({
  uuid_invitado: 'invitado-uuid',
  uuid_evento: 'evento-uuid',
  uuid_lote: 'lote-uuid',
  id_rrpp: 'rrpp-uuid',
  metodo_pago: 'mixto',
  monto_total: 5000,
  monto_efectivo: 3000,
  monto_transferencia: 2000,
  observaciones: '$3000 en efectivo + $2000 transferencia'
})
```

### Consultar ventas

```typescript
// Obtener venta por invitado
const venta = await ventasService.getVentaByInvitado('invitado-uuid')

// Obtener todas las ventas de un evento
const ventas = await ventasService.getVentasByEvento('evento-uuid')

// Obtener ventas de un RRPP específico
const ventasRRPP = await ventasService.getVentasByRRPP('rrpp-uuid')

// Obtener ventas de un RRPP en un evento específico
const ventasRRPP = await ventasService.getVentasByRRPP('rrpp-uuid', 'evento-uuid')

// Verificar si un invitado tiene venta
const hasVenta = await ventasService.hasVenta('invitado-uuid')
```

### Obtener estadísticas

```typescript
// Estadísticas de ventas por evento
const stats = await ventasService.getVentasStatsByEvento('evento-uuid')
// Retorna:
// {
//   total_ventas: 150,
//   total_efectivo: 60,
//   total_transferencia: 70,
//   total_mixto: 20,
//   monto_total_efectivo: 300000,
//   monto_total_transferencia: 450000,
//   monto_total_general: 750000
// }

// Estadísticas de ventas por RRPP
const statsRRPP = await ventasService.getVentasStatsByRRPP('rrpp-uuid')

// Estadísticas de ventas por RRPP en un evento específico
const statsRRPP = await ventasService.getVentasStatsByRRPP('rrpp-uuid', 'evento-uuid')
```

### Actualizar y eliminar

```typescript
// Actualizar venta (solo admin o el RRPP que la creó)
const updatedVenta = await ventasService.updateVenta('venta-uuid', {
  metodo_pago: 'mixto',
  monto_efectivo: 2500,
  monto_transferencia: 2500,
  observaciones: 'Actualizado: pago mixto'
})

// Eliminar venta (solo admin)
await ventasService.deleteVenta('venta-uuid')
```

## Flujo de Trabajo Recomendado

### Cuando un RRPP crea un invitado:

1. El RRPP selecciona un lote
2. Si el lote tiene `precio > 0`:
   - Mostrar selector de método de pago
   - Si selecciona "Mixto": mostrar inputs para monto efectivo y transferencia
   - Validar que los montos sumen el total antes de enviar
3. Crear el invitado
4. Crear el registro de venta automáticamente

### Ejemplo de implementación en el formulario:

```typescript
interface FormData {
  // ... campos de invitado
  uuid_lote: string
  metodo_pago?: 'efectivo' | 'transferencia' | 'mixto'
  monto_efectivo?: number
  monto_transferencia?: number
}

const handleSubmit = async (data: FormData) => {
  // 1. Crear invitado
  const invitado = await invitadosService.createInvitado({
    nombre: data.nombre,
    apellido: data.apellido,
    // ... otros campos
    uuid_lote: data.uuid_lote
  })

  // 2. Obtener precio del lote
  const lote = await lotesService.getLote(data.uuid_lote)

  // 3. Si el lote tiene precio, crear venta
  if (lote.precio > 0) {
    await ventasService.createVenta({
      uuid_invitado: invitado.id,
      uuid_evento: eventoId,
      uuid_lote: lote.id,
      id_rrpp: currentUser.id,
      metodo_pago: data.metodo_pago!,
      monto_total: lote.precio,
      monto_efectivo: data.monto_efectivo || 0,
      monto_transferencia: data.monto_transferencia || 0
    })
  }
}
```

## Reportes y Análisis

El servicio incluye métodos para generar estadísticas útiles:

- **Total de ventas** por evento o RRPP
- **Desglose por método de pago** (efectivo, transferencia, mixto)
- **Montos totales** recaudados en efectivo y transferencia
- **Performance de RRPPs** (quién vendió más)

Estas estadísticas son útiles para:
- Dashboards de administración
- Reportes financieros
- Comisiones de RRPPs
- Análisis de métodos de pago preferidos

## Migración

Para aplicar esta funcionalidad a tu base de datos:

```bash
cd supabase
supabase db push migrations/update/003_create_ventas.sql
```

O ejecuta manualmente el archivo SQL en el Supabase Dashboard > SQL Editor.

## Notas Importantes

1. **Unicidad**: Cada invitado puede tener solo UNA venta (constraint `invitado_unico`)
2. **Validación automática**: Los triggers validan los montos, no es necesario validar en el frontend
3. **Seguridad**: RLS asegura que los RRPPs solo vean sus propias ventas
4. **Cascada**: Si se elimina un invitado, su venta también se elimina automáticamente
5. **Timestamps**: Los campos `created_at` y `updated_at` se manejan automáticamente
