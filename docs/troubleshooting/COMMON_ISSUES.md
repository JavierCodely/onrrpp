# Problemas Comunes y Soluciones

Guía de troubleshooting para los problemas más frecuentes del sistema.

## Autenticación

### "Missing Supabase environment variables"

**Síntoma**: Error al iniciar la aplicación

**Causa**: Variables de entorno no configuradas

**Solución**:
1. Verifica que existe el archivo `.env` en la raíz del proyecto
2. Verifica que contiene:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```
3. Las variables DEBEN tener el prefijo `VITE_`
4. Reinicia el servidor de desarrollo (`npm run dev`)

### "Personal no encontrado"

**Síntoma**: Error después de login exitoso

**Causa**: Usuario existe en `auth.users` pero no en tabla `personal`

**Solución**:
```sql
-- Obtener el UUID del usuario desde Authentication → Users
-- Ejecutar en SQL Editor:
INSERT INTO personal (id, nombre, apellido, edad, sexo, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-de-auth',  -- DEBE coincidir EXACTAMENTE
  'Nombre',
  'Apellido',
  30,
  'hombre',  -- o 'mujer'
  'admin',   -- o 'rrpp', 'seguridad'
  'uuid-del-club',
  true
);
```

**Verificación**:
```sql
-- Verificar que el ID coincide
SELECT u.id, u.email, p.nombre, p.apellido
FROM auth.users u
LEFT JOIN personal p ON p.id = u.id
WHERE u.email = 'tu-email@ejemplo.com';
```

### "Usuario inactivo"

**Síntoma**: No puede acceder después de login

**Causa**: Campo `activo = false` en tabla personal

**Solución**:
```sql
UPDATE personal
SET activo = true
WHERE email = 'tu-email@ejemplo.com';
```

## Base de Datos

### Migraciones fallan

**Síntoma**: Error al ejecutar migraciones SQL

**Causa**: Migraciones ejecutadas fuera de orden

**Solución**:
1. Ejecuta las migraciones en orden numérico estricto:
   - 001 → 002 → 003 → ... → 010
2. Si ya ejecutaste algunas, verifica cuáles faltan:
```sql
-- Ver tablas existentes
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
3. Ejecuta solo las faltantes en orden

### RLS bloquea queries

**Síntoma**: Queries no devuelven datos esperados

**Causa**: Row Level Security bloqueando acceso

**Diagnóstico**:
```sql
-- Verificar que el usuario está activo
SELECT id, nombre, apellido, activo, uuid_club
FROM personal
WHERE id = auth.uid();

-- Verificar función RLS
SELECT get_current_user_club();
SELECT get_current_user_role();
```

**Soluciones**:

1. **Usuario no activo**:
```sql
UPDATE personal SET activo = true WHERE id = auth.uid();
```

2. **Club incorrecto**:
```sql
-- Verificar que uuid_club coincide
SELECT e.id, e.nombre, e.uuid_club
FROM eventos e
WHERE e.uuid_club = get_current_user_club();
```

3. **Rol incorrecto**:
```sql
-- Cambiar rol si es necesario
UPDATE personal
SET rol = 'admin'  -- o 'rrpp', 'seguridad'
WHERE id = auth.uid();
```

## Frontend

### Build fails con Tailwind

**Síntoma**: Error durante `npm run build`

**Causa**: Incompatibilidad con Tailwind v4

**Solución**:
```bash
# Desinstalar Tailwind v4
npm uninstall tailwindcss

# Instalar Tailwind v3
npm install -D tailwindcss@3 postcss autoprefixer

# Regenerar archivos de config
npx tailwindcss init -p
```

Verifica que `tailwind.config.js` usa formato v3:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Cámara no funciona

**Síntoma**: "Camera permission denied" o cámara no inicia

**Causas**:
1. Navegador no tiene permisos
2. No estás usando HTTPS
3. Cámara en uso por otra aplicación

**Soluciones**:

1. **Verificar HTTPS**:
   - Desarrollo: Ya configurado con `@vitejs/plugin-basic-ssl`
   - Producción: Vercel proporciona HTTPS automáticamente

2. **Permisos del navegador**:
   - Chrome: Configuración → Privacidad → Configuración de sitios → Cámara
   - Permitir para tu dominio

3. **Alternativa**:
   - Usar búsqueda manual por código QR
   - No requiere cámara

### Error 404 en rutas

**Síntoma**: Refresh en una ruta da 404

**Causa**: SPA routing no configurado en servidor

**Solución** (ya aplicada):
- Archivo `vercel.json` en la raíz:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Si usas otro servidor:
```nginx
# Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Realtime

### Realtime no funciona

**Síntoma**: Cambios en BD no se reflejan en UI

**Diagnóstico**:
```sql
-- Verificar que Realtime está habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**Solución**:
```sql
-- Habilitar Realtime en tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE invitados;
ALTER PUBLICATION supabase_realtime ADD TABLE lotes;
```

**Verificar en Frontend**:
```typescript
// Verificar que el canal se suscribió correctamente
supabase
  .channel('test-channel')
  .on('postgres_changes', { event: '*', table: 'eventos' }, (payload) => {
    console.log('Realtime recibido:', payload)
  })
  .subscribe((status) => {
    console.log('Status:', status) // Debe ser 'SUBSCRIBED'
  })
```

### WebSocket connection failed

**Síntoma**: Error de WebSocket en consola

**Causas**:
1. No estás usando HTTPS
2. Firewall bloqueando WebSockets
3. Proyecto Supabase pausado

**Soluciones**:
1. Usar HTTPS (ya configurado)
2. Verificar estado del proyecto en Supabase Dashboard
3. Reactivar proyecto si está pausado

## Contadores

### Contadores no actualizan

**Síntoma**: `total_invitados` o `total_ingresados` incorrecto

**Ver**: [Documentación de Contadores](./COUNTERS.md)

### Lotes muestran capacidad incorrecta

**Síntoma**: Lote muestra disponibilidad incorrecta

**Ver**: [Documentación de Lotes](./LOTES_CAPACITY.md)

## Performance

### Queries lentas

**Síntoma**: Aplicación lenta al cargar datos

**Diagnóstico**:
```sql
-- Ver queries lentas (requiere pg_stat_statements)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Soluciones**:

1. **Agregar índices**:
```sql
-- Índices recomendados
CREATE INDEX idx_invitados_evento ON invitados(uuid_evento);
CREATE INDEX idx_invitados_rrpp ON invitados(id_rrpp);
CREATE INDEX idx_invitados_qr ON invitados(qr_code);
CREATE INDEX idx_ventas_evento ON ventas(uuid_evento);
CREATE INDEX idx_ventas_rrpp ON ventas(id_rrpp);
```

2. **Usar paginación**:
```typescript
const { data, error } = await supabase
  .from('invitados')
  .select('*')
  .range(0, 49) // Primeros 50 resultados
```

3. **Limitar campos**:
```typescript
// En vez de SELECT *
.select('id, nombre, apellido, ingresado')
```

## Deployment

### Build error en Vercel

**Síntoma**: Deploy falla en Vercel

**Causas comunes**:
1. Errores de TypeScript
2. Variables de entorno no configuradas
3. Dependencias faltantes

**Soluciones**:

1. **Verificar build local**:
```bash
npm run build
# Debe completar sin errores
```

2. **Configurar variables en Vercel**:
   - Dashboard → Settings → Environment Variables
   - Agregar: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

3. **Verificar package.json**:
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### "Module not found" después de deploy

**Síntoma**: Error 500 después de deploy exitoso

**Causa**: Import incorrecto (case-sensitive en producción)

**Solución**:
```typescript
// ❌ Incorrecto (puede funcionar en Windows, falla en Linux)
import { Component } from '@/components/myComponent'

// ✅ Correcto (case-sensitive)
import { Component } from '@/components/MyComponent'
```

## Storage

### Imágenes no cargan

**Síntoma**: Banner de evento o foto VIP no se muestra

**Diagnóstico**:
```sql
-- Verificar que el bucket existe
SELECT id, name, public
FROM storage.buckets;

-- Verificar políticas de storage
SELECT *
FROM storage.policies
WHERE bucket_id = 'event-banners';
```

**Soluciones**:

1. **Bucket no existe**:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true);
```

2. **Falta política de lectura**:
```sql
CREATE POLICY "Public read event banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');
```

3. **Verificar URL**:
```typescript
// Debe devolver URL pública
const { data } = supabase.storage
  .from('event-banners')
  .getPublicUrl('filename.jpg')

console.log(data.publicUrl)
```

## Checklist de Depuración General

Cuando tengas un error no documentado:

1. [ ] Verificar consola del navegador (F12)
2. [ ] Verificar Network tab para errores de API
3. [ ] Verificar que variables de entorno están cargadas
4. [ ] Verificar que el usuario está autenticado
5. [ ] Verificar RLS policies en Supabase
6. [ ] Verificar que migraciones están aplicadas
7. [ ] Intentar la operación directamente en SQL Editor
8. [ ] Verificar logs de Supabase Dashboard

## Obtener Ayuda

Si ninguna solución funciona:

1. **Exporta logs**:
```bash
# Frontend
# Copiar errores de la consola del navegador

# Backend
# Supabase Dashboard → Database → Logs
```

2. **Reproduce el error**:
   - Pasos exactos para reproducir
   - Rol de usuario usado
   - Datos de ejemplo

3. **Información del sistema**:
   - Node version: `node --version`
   - npm version: `npm --version`
   - SO: Windows/Mac/Linux
