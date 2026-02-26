# Guía de Imágenes de Perfil VIP

## Descripción

Sistema de imágenes de perfil para invitados VIP. Las imágenes son **obligatorias** cuando se asigna un invitado a un lote con `es_vip = true`.

## Estructura de Base de Datos

### Tabla `invitados`

```sql
ALTER TABLE invitados
ADD COLUMN profile_image_url TEXT;
```

- **Campo**: `profile_image_url`
- **Tipo**: `TEXT` (nullable)
- **Descripción**: URL de la imagen de perfil almacenada en Supabase Storage
- **Obligatorio**: Solo cuando el lote del invitado tiene `es_vip = true`

## Storage Bucket

### Configuración

- **Bucket ID**: `vip-profiles`
- **Acceso**: Público (lectura)
- **Estructura de carpetas**: `{uuid_club}/{invitado_id}-{timestamp}.{ext}`

### Políticas de Seguridad (RLS)

#### Para RRPPs:
- ✅ **Upload**: Pueden subir imágenes a la carpeta de su club
- ✅ **Update**: Pueden actualizar imágenes de su club
- ✅ **Delete**: Pueden eliminar imágenes de su club
- ✅ **Select**: Pueden ver todas las imágenes (bucket público)

#### Para Admins:
- ✅ **Upload**: Pueden subir imágenes a la carpeta de su club
- ✅ **Update**: Pueden actualizar imágenes de su club
- ✅ **Delete**: Pueden eliminar imágenes de su club
- ✅ **Select**: Pueden ver todas las imágenes (bucket público)

#### Para todos:
- ✅ **Select**: Lectura pública de todas las imágenes

## Validaciones

### Frontend (InvitadosPage.tsx)

1. **Validación de lote VIP**:
   ```typescript
   if (loteSeleccionado && loteSeleccionado.es_vip) {
     if (!selectedInvitado && !profileImageFile) {
       toast.error('La imagen de perfil es obligatoria para invitados VIP')
       return
     }
   }
   ```

2. **Validación de archivo**:
   - Tipo: Solo imágenes (`image/*`)
   - Tamaño máximo: 5MB
   - Formatos recomendados: JPG, PNG

### Backend (invitados.service.ts)

```typescript
async uploadProfileImage(
  file: File,
  clubId: string,
  invitadoId: string
): Promise<{ url: string | null; error: Error | null }>
```

- Valida tipo de archivo
- Valida tamaño máximo (5MB)
- Genera nombre único: `{invitadoId}-{timestamp}.{ext}`
- Sube a: `{clubId}/{fileName}`
- Retorna URL pública

## Flujo de Uso

### Crear Invitado VIP

1. Usuario selecciona evento
2. Usuario hace clic en "Nuevo Invitado"
3. Usuario completa formulario básico
4. Usuario selecciona lote VIP
5. **Aparece campo obligatorio**: "Imagen de Perfil VIP" con badge dorado
6. Usuario sube imagen (se muestra preview)
7. Al guardar:
   - Se sube imagen a Storage
   - Se crea invitado con `profile_image_url`
   - Se registra venta si el lote tiene precio

### Editar Invitado VIP

1. Usuario hace clic en "Editar" en un invitado VIP
2. Se muestra imagen actual (si existe)
3. Usuario puede:
   - Mantener imagen actual
   - Eliminar imagen y subir nueva (botón X en preview)
   - Subir nueva imagen (reemplaza automáticamente)
4. Al guardar:
   - Si hay nueva imagen: se sube y se elimina la anterior
   - Se actualiza `profile_image_url` en la BD

### Cambiar Lote de VIP a No-VIP

1. Usuario edita invitado VIP
2. Usuario cambia lote a uno no-VIP
3. Campo de imagen se oculta automáticamente
4. Imagen actual se mantiene en BD (no se elimina)
5. **Nota**: La imagen NO es obligatoria para lotes no-VIP

### Cambiar Lote de No-VIP a VIP

1. Usuario edita invitado no-VIP
2. Usuario cambia lote a VIP
3. Campo de imagen aparece marcado como obligatorio
4. Si no había imagen: usuario DEBE subir una
5. Si había imagen: se muestra y se puede mantener o cambiar

## Migraciones

### Orden de Ejecución

1. `011_add_profile_image_to_invitados.sql` - Agrega columna a tabla
2. `012_create_vip_profiles_storage.sql` - Crea bucket y políticas RLS

### Ejecutar Migraciones

```bash
cd supabase
supabase db push
```

O manualmente en Supabase Dashboard → SQL Editor:
1. Ejecutar `011_add_profile_image_to_invitados.sql`
2. Ejecutar `012_create_vip_profiles_storage.sql`

## Interfaz de Usuario

### Indicadores Visuales

- **Badge VIP**: Ícono de corona dorada
- **Campo obligatorio**: Asterisco rojo (*)
- **Preview**: Imagen con borde dorado
- **Botón eliminar**: X rojo en esquina superior derecha
- **Estado carga**: "Subiendo imagen..." en botón submit

### Ubicación en Formulario

```
[Nombre] [Apellido]
[Edad] [Sexo]
[Ubicación]
[Lote] ← Si es VIP, muestra badge 👑
---
[Imagen de Perfil VIP *] ← Solo si lote es VIP
  [Preview de imagen]
  [Input file]
---
[Información de Pago] ← Solo si lote tiene precio > 0
```

## Ejemplos de Código

### Subir Imagen

```typescript
const { url, error } = await invitadosService.uploadProfileImage(
  file,
  user.uuid_club,
  invitadoId
)
```

### Eliminar Imagen

```typescript
const { error } = await invitadosService.deleteProfileImage(
  profileImageUrl,
  user.uuid_club
)
```

### Crear Invitado con Imagen

```typescript
const invitadoData = {
  nombre: 'Juan',
  apellido: 'Pérez',
  // ... otros campos
  uuid_lote: loteVipId,
  profile_image_url: profileImageUrl, // URL de Storage
}

const { data, error } = await invitadosService.createInvitado(
  invitadoData,
  rrppId
)
```

## Troubleshooting

### Error: "La imagen de perfil es obligatoria para invitados VIP"
- **Causa**: Intentando guardar invitado VIP sin imagen
- **Solución**: Subir una imagen antes de guardar

### Error: "El archivo debe ser una imagen"
- **Causa**: Archivo seleccionado no es imagen
- **Solución**: Seleccionar archivo JPG, PNG u otro formato de imagen

### Error: "La imagen no debe superar los 5MB"
- **Causa**: Archivo muy grande
- **Solución**: Comprimir imagen o usar una más pequeña

### Error: "No tienes permisos para eliminar esta imagen"
- **Causa**: Intentando eliminar imagen de otro club
- **Solución**: Verificar que el `uuid_club` coincida

### La imagen no se muestra
- **Causa**: URL incorrecta o archivo eliminado
- **Solución**: Verificar URL en tabla `invitados` y existencia en Storage

## Seguridad

### Validaciones Implementadas

1. ✅ Solo usuarios autenticados pueden subir imágenes
2. ✅ Los usuarios solo pueden subir a la carpeta de su club
3. ✅ Los usuarios solo pueden eliminar imágenes de su club
4. ✅ Validación de tipo de archivo (solo imágenes)
5. ✅ Validación de tamaño (máx. 5MB)
6. ✅ Las imágenes son públicas para lectura (necesario para QR/compartir)

### Recomendaciones

- No subir información sensible en las imágenes
- Usar imágenes de perfil apropiadas (rostros, avatares)
- Comprimir imágenes antes de subir para mejor rendimiento
- Considerar agregar moderación de contenido en producción

## Integración con QR

Las imágenes de perfil VIP se pueden mostrar en:
- Dialog de QR (ya implementado)
- Lista de invitados (mostrar avatar en tabla)
- Escáner de seguridad (mostrar foto al escanear)

Para agregar la imagen en otros lugares, usar:

```typescript
{invitado.profile_image_url && (
  <img
    src={invitado.profile_image_url}
    alt={`${invitado.nombre} ${invitado.apellido}`}
    className="w-10 h-10 rounded-full object-cover border-2 border-yellow-500"
  />
)}
```
