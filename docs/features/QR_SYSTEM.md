# Sistema de Códigos QR

Sistema completo de gestión de invitados con códigos QR únicos para cada invitado.

## Funcionalidades

### Para RRPP

- Crear invitados y generar QR automáticamente
- Ver QR de cualquier invitado
- Descargar QR como imagen PNG
- Compartir QR con invitados

### Para Seguridad

- Escanear QR con cámara
- Búsqueda manual por código
- Marcar ingreso de invitados
- Ver información completa del invitado

## Formato del Código QR

- **Longitud**: 12 caracteres
- **Formato**: Alfanumérico mayúsculas (A-Z, 0-9)
- **Ejemplo**: `A3F5D9B2C8E1`
- **Único**: Garantizado por constraint UNIQUE en BD
- **Generación**: Automática via trigger SQL

## Migración de Base de Datos

### Archivo

`supabase/migrations/update/001_add_qr_to_invitados.sql`

### Cambios

1. Agrega columna `qr_code VARCHAR(12) UNIQUE` a tabla `invitados`
2. Crea función `generate_unique_qr_code()` para generar códigos únicos
3. Crea trigger que asigna QR automáticamente en INSERT
4. Genera QR para invitados existentes
5. Crea índice único en `qr_code` para búsquedas rápidas

### Aplicar Migración

**Dashboard de Supabase**:
1. SQL Editor
2. Copiar y ejecutar contenido del archivo
3. Verificar mensaje de éxito

**Supabase CLI**:
```bash
cd supabase
supabase db push
```

## Uso - RRPP

### Crear Invitado con QR

```typescript
import { crearInvitado } from '@/services/invitados.service'

// El QR se genera automáticamente
const invitado = await crearInvitado({
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  edad: 25,
  sexo: 'hombre',
  uuid_evento: 'evento-uuid',
  id_rrpp: 'rrpp-uuid'
})

// invitado.qr_code = "A3F5D9B2C8E1" (generado automáticamente)
```

### Ver QR del Invitado

Componente ya implementado en `InvitadosPage.tsx`:

```tsx
<Dialog>
  <DialogContent>
    <QRCodeSVG
      value={invitado.qr_code}
      size={256}
      level="H"
    />
    <Button onClick={descargarQR}>
      Descargar QR
    </Button>
  </DialogContent>
</Dialog>
```

### Descargar QR como Imagen

```typescript
const descargarQR = (qrCode: string, nombreInvitado: string) => {
  const canvas = document.querySelector('canvas')
  if (!canvas) return

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob!)
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-${nombreInvitado}.png`
    link.click()
  })
}
```

## Uso - Seguridad

### Escanear QR con Cámara

Componente implementado en `ScannerPage.tsx`:

```typescript
import { Html5Qrcode } from 'html5-qrcode'

const scanner = new Html5Qrcode('reader')

scanner.start(
  { facingMode: 'environment' }, // Cámara trasera
  {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  },
  (decodedText) => {
    // decodedText = "A3F5D9B2C8E1"
    buscarInvitadoPorQR(decodedText)
  }
)
```

### Buscar Invitado por QR

```typescript
import { buscarInvitadoPorQR } from '@/services/invitados.service'

const invitado = await buscarInvitadoPorQR('A3F5D9B2C8E1')

if (invitado) {
  console.log(invitado.nombre, invitado.ingresado)
}
```

### Marcar Ingreso

```typescript
import { marcarIngreso } from '@/services/invitados.service'

await marcarIngreso(invitado.id, true)
// Actualiza ingresado = true y fecha_ingreso = now()
```

## Seguridad (RLS)

### Políticas Implementadas

**RRPP**:
- Ver QR de sus propios invitados
- NO pueden modificar campo `qr_code` manualmente
- NO pueden modificar `ingresado` o `fecha_ingreso`

**Seguridad**:
- Ver QR de invitados de su club
- Pueden actualizar SOLO `ingresado` y `fecha_ingreso`
- NO pueden modificar `qr_code`

**Admin**:
- Ver QR de todos los invitados de su club
- NO puede crear/editar invitados directamente

## Estados del Invitado

### Pendiente
- `ingresado = false`
- `fecha_ingreso = null`
- Badge amarillo en UI

### Ingresado
- `ingresado = true`
- `fecha_ingreso = timestamp actual`
- Badge verde en UI

## Flujo Completo

1. **RRPP crea invitado**
   - Sistema genera QR automático
   - RRPP descarga QR
   - RRPP comparte QR con invitado

2. **Invitado llega al evento**
   - Muestra QR en su teléfono o impreso

3. **Seguridad escanea QR**
   - Cámara detecta código
   - Sistema busca invitado
   - Muestra información completa

4. **Seguridad valida y marca ingreso**
   - Verifica datos del invitado
   - Click en "Marcar Ingreso"
   - Sistema actualiza estado

5. **Actualización en tiempo real**
   - RRPP ve cambio de estado (Realtime)
   - Admin ve contador de ingresados incrementado

## Dependencias

```json
{
  "qrcode.react": "^4.1.0",
  "html5-qrcode": "^2.3.8"
}
```

Instalación:
```bash
npm install qrcode.react html5-qrcode
```

## Troubleshooting

### Cámara no funciona

**Síntoma**: "Camera permission denied"

**Causas**:
- Navegador no tiene permisos
- No estás usando HTTPS
- Cámara en uso por otra app

**Solución**:
1. Verificar que el servidor usa HTTPS (ya configurado en vite)
2. Dar permisos de cámara al navegador
3. Usar búsqueda manual como alternativa

### QR no se genera

**Síntoma**: Invitado creado pero `qr_code = null`

**Causas**:
- Trigger no se ejecutó
- Migración no aplicada

**Solución**:
```sql
-- Verificar que el trigger existe
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name = 'trigger_generate_qr_on_insert';

-- Generar QR manualmente para invitados sin QR
UPDATE invitados
SET qr_code = generate_unique_qr_code()
WHERE qr_code IS NULL;
```

### QR duplicado

**Síntoma**: Error "duplicate key value violates unique constraint"

**Causa**: Colisión de QR (muy improbable con 12 caracteres)

**Solución**: El trigger automáticamente reintenta con nuevo código.

### Invitado no encontrado al escanear

**Síntoma**: QR escaneado pero no aparece invitado

**Causas**:
- QR no pertenece al sistema
- Invitado fue eliminado
- RLS bloqueando query

**Solución**:
```sql
-- Buscar QR directamente en BD
SELECT * FROM invitados WHERE qr_code = 'A3F5D9B2C8E1';

-- Verificar que el invitado pertenece al club del usuario
SELECT i.*, e.uuid_club
FROM invitados i
JOIN eventos e ON e.id = i.uuid_evento
WHERE i.qr_code = 'A3F5D9B2C8E1';
```

## Mejoras Futuras

- [ ] Formato QR personalizado (logo del club)
- [ ] Compartir QR por WhatsApp/Email
- [ ] QR dinámico con información adicional
- [ ] Estadísticas de escaneo de QR
- [ ] Re-entry tracking para VIP
