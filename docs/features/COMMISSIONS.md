# Sistema de Comisiones para RRPP

Sistema completo de comisiones configurables por lote. Los administradores pueden configurar comisiones en monto fijo o porcentaje para cada lote.

## Características

### Configuración de Comisiones (Admin)

Cuando un admin crea o edita un lote, puede configurar:

- **Tipo de comisión**: Monto fijo o porcentaje
- **Comisión en pesos**: Ejemplo: $500 por cada venta
- **Comisión en porcentaje**: Ejemplo: 15% del precio de venta

### Vista de Comisiones (RRPP)

Los RRPP pueden ver en "Mis Ventas":

- **Comisión total**: Total ganado en el evento seleccionado
- **Desglose por lote**: Ventas y comisiones de cada lote
- **Estadísticas**: Total de ventas, recaudado, métodos de pago

## Migración de Base de Datos

### Archivo

`supabase/migrations/028_add_comision_rrpp_to_lotes.sql`

### Cambios en la Tabla `lotes`

```sql
-- Nuevas columnas
comision_tipo VARCHAR(10) CHECK (comision_tipo IN ('monto', 'porcentaje'))
comision_rrpp_monto DECIMAL(10, 2) DEFAULT 0 CHECK (comision_rrpp_monto >= 0)
comision_rrpp_porcentaje DECIMAL(5, 2) DEFAULT 0 CHECK (comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100)
```

### Nueva Vista SQL

`ventas_rrpp_stats` - Vista materializada que calcula:

```sql
CREATE VIEW ventas_rrpp_stats AS
SELECT
  v.id_rrpp,
  v.uuid_evento,
  v.uuid_lote,
  l.nombre as lote_nombre,
  l.precio as lote_precio,
  l.comision_tipo,
  l.comision_rrpp_monto,
  l.comision_rrpp_porcentaje,
  COUNT(v.id) as cantidad_ventas,
  SUM(v.monto_total) as monto_total_vendido,
  SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.monto_total ELSE 0 END) as monto_efectivo,
  SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.monto_total ELSE 0 END) as monto_transferencia,
  -- Cálculo de comisión
  CASE
    WHEN l.comision_tipo = 'monto' THEN
      COUNT(v.id) * l.comision_rrpp_monto
    WHEN l.comision_tipo = 'porcentaje' THEN
      SUM(v.monto_total) * (l.comision_rrpp_porcentaje / 100)
    ELSE 0
  END as comision_total
FROM ventas v
JOIN lotes l ON l.id = v.uuid_lote
GROUP BY v.id_rrpp, v.uuid_evento, v.uuid_lote, l.nombre, l.precio,
         l.comision_tipo, l.comision_rrpp_monto, l.comision_rrpp_porcentaje;
```

### Aplicar Migración

**Dashboard de Supabase**:
```sql
-- Ejecutar en SQL Editor
-- Contenido de: supabase/migrations/028_add_comision_rrpp_to_lotes.sql
```

**Supabase CLI**:
```bash
cd supabase
supabase db push
```

## Configuración - Admin

### Crear Lote con Comisión Fija

```typescript
const lote = {
  nombre: 'Early Bird',
  precio: 2500,
  cantidad_maxima: 100,
  comision_tipo: 'monto',
  comision_rrpp_monto: 400,
  comision_rrpp_porcentaje: 0,
  uuid_evento: 'evento-uuid'
}

await crearLote(lote)
```

Resultado: RRPP gana $400 por cada venta de este lote.

### Crear Lote con Comisión Porcentual

```typescript
const lote = {
  nombre: 'VIP Premium',
  precio: 8000,
  cantidad_maxima: 50,
  comision_tipo: 'porcentaje',
  comision_rrpp_monto: 0,
  comision_rrpp_porcentaje: 15,
  uuid_evento: 'evento-uuid'
}

await crearLote(lote)
```

Resultado: RRPP gana 15% del total vendido ($1200 por venta).

## Vista de Comisiones - RRPP

### Obtener Estadísticas con Comisiones

```typescript
import { getVentasStatsConComisiones } from '@/services/ventas.service'

const stats = await getVentasStatsConComisiones('evento-uuid', 'rrpp-uuid')

console.log(stats)
// {
//   lotes: [
//     {
//       lote_nombre: 'Early Bird',
//       cantidad_ventas: 10,
//       lote_precio: 2500,
//       comision_tipo: 'monto',
//       comision_rrpp_monto: 400,
//       comision_total: 4000
//     },
//     {
//       lote_nombre: 'VIP Premium',
//       cantidad_ventas: 5,
//       lote_precio: 8000,
//       comision_tipo: 'porcentaje',
//       comision_rrpp_porcentaje: 15,
//       comision_total: 6000
//     }
//   ],
//   total_comision: 10000
// }
```

## Cálculo de Comisiones

### Comisión Fija (Monto)

```
comision_total = cantidad_ventas × comision_rrpp_monto
```

**Ejemplo**:
- Lote: $2500
- Comisión: $400 por venta
- Ventas: 10
- **Total**: 10 × $400 = **$4000**

### Comisión Porcentual

```
comision_total = monto_total_vendido × (comision_rrpp_porcentaje / 100)
```

**Ejemplo**:
- Lote: $8000
- Comisión: 15%
- Ventas: 5
- Monto vendido: $40000
- **Total**: $40000 × 0.15 = **$6000**

## Validaciones

### Backend (SQL)

```sql
CHECK (comision_rrpp_monto >= 0)
CHECK (comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100)
CHECK (comision_tipo IN ('monto', 'porcentaje'))
```

### Frontend

```typescript
// Validación de tipo
if (comisionTipo === 'monto') {
  // Required: comision_rrpp_monto
  // Reset: comision_rrpp_porcentaje = 0
}

if (comisionTipo === 'porcentaje') {
  // Required: comision_rrpp_porcentaje
  // Reset: comision_rrpp_monto = 0
  // Max: 100
}
```

## UI Components

### Formulario de Lote (Admin)

```tsx
<div className="space-y-4">
  <Label>Tipo de Comisión</Label>
  <Select value={comisionTipo} onValueChange={setComisionTipo}>
    <SelectItem value="monto">Monto Fijo</SelectItem>
    <SelectItem value="porcentaje">Porcentaje</SelectItem>
  </Select>

  {comisionTipo === 'monto' && (
    <Input
      type="number"
      placeholder="Ej: 500"
      value={comisionMonto}
      onChange={(e) => setComisionMonto(e.target.value)}
    />
  )}

  {comisionTipo === 'porcentaje' && (
    <div>
      <Input
        type="number"
        min="0"
        max="100"
        placeholder="Ej: 15"
        value={comisionPorcentaje}
        onChange={(e) => setComisionPorcentaje(e.target.value)}
      />
      {precio && comisionPorcentaje && (
        <p className="text-sm text-muted-foreground">
          = ${(precio * (comisionPorcentaje / 100)).toFixed(2)} por venta
        </p>
      )}
    </div>
  )}
</div>
```

### Card de Comisión Total (RRPP)

```tsx
<Card className="bg-gradient-to-br from-yellow-500 to-orange-600">
  <CardHeader>
    <CardTitle className="text-white">
      Comisión Total del Evento
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-4xl font-bold text-white">
      ${totalComision.toLocaleString()}
    </p>
  </CardContent>
</Card>
```

## Seguridad (RLS)

La vista `ventas_rrpp_stats` usa `security_invoker = true`:

- Solo RRPP pueden ver sus propias comisiones
- Solo eventos del club del usuario son visibles
- Respeta todas las políticas RLS existentes

## Actualizar Lotes Existentes

Si tienes lotes creados antes de la migración:

```sql
-- Asignar comisión fija a lotes normales
UPDATE lotes
SET
  comision_tipo = 'monto',
  comision_rrpp_monto = 500,
  comision_rrpp_porcentaje = 0
WHERE es_vip = false;

-- Asignar comisión porcentual a lotes VIP
UPDATE lotes
SET
  comision_tipo = 'porcentaje',
  comision_rrpp_monto = 0,
  comision_rrpp_porcentaje = 20
WHERE es_vip = true;
```

## Ejemplos de Configuración

### Evento: Fiesta de Año Nuevo

```
Lote "Early Bird" (normal)
- Precio: $2500
- Comisión: $300 (monto fijo)
- Si vende 20 → Gana $6000

Lote "General" (normal)
- Precio: $3500
- Comisión: $400 (monto fijo)
- Si vende 15 → Gana $6000

Lote "VIP" (premium)
- Precio: $8000
- Comisión: 20% (porcentaje)
- Si vende 8 → Gana $12800 (20% de $64000)

TOTAL COMISIÓN: $24800
```

## Reportes

### Query para Reporte de Admin

Ver comisiones pagadas por evento:

```sql
SELECT
  p.nombre || ' ' || p.apellido as rrpp,
  SUM(vrs.comision_total) as total_comision,
  SUM(vrs.cantidad_ventas) as total_ventas
FROM ventas_rrpp_stats vrs
JOIN personal p ON p.id = vrs.id_rrpp
WHERE vrs.uuid_evento = 'evento-uuid'
GROUP BY p.id, p.nombre, p.apellido
ORDER BY total_comision DESC;
```

## Mejoras Futuras

- [ ] Dashboard admin para ver comisiones totales
- [ ] Exportar reporte de comisiones en PDF
- [ ] Notificaciones cuando se alcanza umbral
- [ ] Gráficos de evolución de comisiones
- [ ] Sistema de pagos/liquidaciones
- [ ] Comisiones escalonadas (más ventas = mayor %)
