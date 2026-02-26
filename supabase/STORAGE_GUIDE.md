# Guia de Uso de Storage para Banners de Eventos

Esta guia explica como subir y gestionar banners de eventos usando Supabase Storage.

## Bucket Configurado

**Nombre del Bucket:** event-banners
**Acceso:** Publico (las imagenes son visibles para todos)
**Estructura de carpetas:** {uuid_club}/{nombre_archivo}

## Politicas de Seguridad

- Admins pueden subir/actualizar/eliminar banners de su club
- Todos pueden ver los banners (bucket publico)
- Los archivos se organizan por club (multi-tenant)

## Estructura de Archivos

```
event-banners/
  - {uuid_club_1}/
    - evento-123.jpg
    - evento-456.png
  - {uuid_club_2}/
    - evento-789.jpg
```

## Implementacion en el Frontend

### 1. Configurar Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. Subir Banner de Evento

```typescript
export async function uploadEventBanner(
  file: File,
  clubId: string,
  eventoId: string
) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${eventoId}-${Date.now()}.${fileExt}`
  const filePath = `${clubId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('event-banners')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('event-banners')
    .getPublicUrl(filePath)

  return data.publicUrl
}
```

### 3. Actualizar URL en Evento

```typescript
export async function updateEventoBanner(eventoId: string, bannerUrl: string) {
  const { error } = await supabase
    .from('eventos')
    .update({ banner_url: bannerUrl })
    .eq('id', eventoId)

  if (error) throw error
}
```

### 4. Eliminar Banner

```typescript
export async function deleteEventBanner(bannerUrl: string) {
  const url = new URL(bannerUrl)
  const path = url.pathname.split('/event-banners/')[1]

  const { error } = await supabase.storage
    .from('event-banners')
    .remove([path])

  if (error) throw error
}
```

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Recomendaciones

- Formato: JPG, PNG o WebP
- Tamano recomendado: 1200x600px
- Peso maximo: 5MB
- Comprimir imagenes antes de subir
