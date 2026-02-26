# Deploy en Vercel

Guía completa para desplegar la aplicación en Vercel con Supabase.

## Prerrequisitos

- Cuenta en [Vercel](https://vercel.com)
- Proyecto Supabase configurado
- Repositorio Git (GitHub, GitLab, o Bitbucket)

## Paso 1: Preparar el Proyecto

### Verificar Build Local

Antes de deployar, verifica que el build funciona localmente:

```bash
npm run build
```

Debe completar sin errores. Si hay errores:
- Corrige errores de TypeScript
- Verifica que todas las dependencias están instaladas
- Verifica que `.env` existe localmente (no se sube a Git)

### Archivo vercel.json

El proyecto ya incluye `vercel.json` en la raíz:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Este archivo asegura que el routing de SPA funcione correctamente.

## Paso 2: Obtener Credenciales de Supabase

1. Ve a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJxxx...`

## Paso 3: Deploy desde Vercel Dashboard

### 3.1 Importar Proyecto

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click en **Add New...** → **Project**
3. **Import** tu repositorio Git
4. Vercel detecta automáticamente que es un proyecto Vite

### 3.2 Configurar Build Settings

Vercel detecta automáticamente:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

No necesitas cambiar nada. Si quieres personalizar:

```
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
Development Command: npm run dev
```

### 3.3 Configurar Variables de Entorno

Antes de hacer deploy, configura las variables:

1. En la sección **Environment Variables**
2. Agrega las siguientes variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJxxx...` |

**Importante**:
- Las variables DEBEN tener el prefijo `VITE_`
- Agrega las variables para **todos los entornos** (Production, Preview, Development)

3. Click en **Deploy**

## Paso 4: Deploy desde Vercel CLI

Alternativa usando la terminal:

### 4.1 Instalar Vercel CLI

```bash
npm i -g vercel
```

### 4.2 Login

```bash
vercel login
```

### 4.3 Deploy

```bash
# Desde la raíz del proyecto
vercel

# Seguir las preguntas:
# - Set up and deploy? Yes
# - Which scope? Tu cuenta
# - Link to existing project? No
# - Project name? onrrpp2
# - Directory? ./
# - Override settings? No
```

### 4.4 Agregar Variables de Entorno

```bash
# Agregar VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL
# Pegar el valor cuando te lo pida
# Seleccionar: Production, Preview, Development

# Agregar VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY
# Pegar el valor cuando te lo pida
# Seleccionar: Production, Preview, Development
```

### 4.5 Deploy a Producción

```bash
vercel --prod
```

## Paso 5: Configurar Supabase para Producción

### 5.1 Autorizar Dominio en Supabase

1. Ve a tu proyecto en Supabase
2. **Authentication** → **URL Configuration**
3. Agrega tu URL de Vercel a:

**Site URL**:
```
https://tu-proyecto.vercel.app
```

**Redirect URLs** (agregar ambas):
```
https://tu-proyecto.vercel.app
https://tu-proyecto.vercel.app/**
```

### 5.2 Configurar CORS (ya configurado)

Supabase permite CORS por defecto. Si tienes problemas:

1. **Settings** → **API**
2. **API Settings** → **CORS Allowed Origins**
3. Agregar: `https://tu-proyecto.vercel.app`

## Paso 6: Verificar Deploy

### 6.1 Acceder a la Aplicación

Vercel te dará una URL:
```
https://tu-proyecto.vercel.app
```

### 6.2 Checklist de Verificación

- [ ] La aplicación carga correctamente
- [ ] Login funciona
- [ ] Dashboard carga según rol
- [ ] Realtime funciona (cambios en BD se reflejan)
- [ ] Storage funciona (imágenes cargan)
- [ ] Rutas funcionan (refresh no da 404)
- [ ] Cámara funciona (Seguridad puede escanear QR)

### 6.3 Verificar Variables de Entorno

En la consola del navegador (F12):

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

Deben mostrar los valores correctos (no `undefined`).

## Actualizar el Deploy

### Desde Git (Automático)

Vercel hace deploy automático cuando haces push a tu rama:

```bash
git add .
git commit -m "tu mensaje"
git push
```

Vercel detecta el push y redeploya automáticamente.

### Manualmente desde CLI

```bash
vercel --prod
```

### Desde Dashboard

1. Ve a tu proyecto en Vercel Dashboard
2. **Deployments** tab
3. Click en **Redeploy** en el último deployment

## Configuración Avanzada

### Dominios Personalizados

1. Vercel Dashboard → tu proyecto
2. **Settings** → **Domains**
3. Click **Add**
4. Ingresa tu dominio: `eventos.tudominio.com`
5. Configura DNS según las instrucciones de Vercel

### Preview Deployments

Vercel crea un preview deployment por cada Pull Request:

```
https://tu-proyecto-git-branch-tu-usuario.vercel.app
```

Útil para testing antes de mergear a main.

### Variables de Entorno por Ambiente

Puedes tener diferentes variables para cada ambiente:

```bash
# Solo para Production
vercel env add API_URL production

# Solo para Preview
vercel env add API_URL preview

# Solo para Development
vercel env add API_URL development
```

### Build Optimizations

Vercel ya optimiza el build de Vite. Si quieres más optimización:

**vercel.json**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Monitoring

### Vercel Analytics

Activa analytics en Vercel Dashboard:

1. Tu proyecto → **Analytics**
2. Click **Enable**
3. Ver métricas de performance

### Logs

Ver logs de deployment:

1. Vercel Dashboard → Deployments
2. Click en un deployment
3. Ver **Build Logs** y **Function Logs**

### Errores en Producción

Si hay errores después del deploy:

1. **Vercel Dashboard** → **Deployments** → Click deployment → **Logs**
2. **Browser Console** (F12) en producción
3. **Supabase Dashboard** → **Logs** → **Postgres Logs**

## Troubleshooting

### Build Fails

**Error**: "Build failed"

**Solución**:
1. Verifica que `npm run build` funciona localmente
2. Verifica errores de TypeScript
3. Verifica que todas las dependencias están en `package.json` (no solo en `devDependencies`)

### Variables de Entorno No Funcionan

**Error**: `undefined` al acceder a variables

**Causa**: Variables sin prefijo `VITE_`

**Solución**:
```bash
# ❌ Incorrecto
SUPABASE_URL=xxx

# ✅ Correcto
VITE_SUPABASE_URL=xxx
```

### Error 404 en Rutas

**Error**: Refresh en una ruta da 404

**Causa**: `vercel.json` falta o mal configurado

**Solución**: Verificar que `vercel.json` existe en la raíz con el contenido correcto.

### Realtime No Funciona en Producción

**Error**: WebSocket connection failed

**Causa**: Dominio no autorizado en Supabase

**Solución**:
1. Supabase → Authentication → URL Configuration
2. Agregar dominio de Vercel a Redirect URLs

### Storage/Imágenes No Cargan

**Error**: Failed to load image

**Causa**: CORS o políticas de storage

**Solución**:
1. Verificar políticas en storage.policies
2. Verificar que bucket es público
3. Verificar CORS en Supabase settings

## Costos

### Vercel

- **Hobby Plan**: Gratis
  - 100 GB bandwidth/mes
  - Deployments ilimitados
  - HTTPS automático

- **Pro Plan**: $20/mes
  - 1 TB bandwidth/mes
  - Analytics avanzado
  - Soporte prioritario

### Supabase

- **Free Tier**:
  - 500 MB database
  - 1 GB storage
  - 2 GB bandwidth

- **Pro Plan**: $25/mes
  - 8 GB database
  - 100 GB storage
  - 250 GB bandwidth

## Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
