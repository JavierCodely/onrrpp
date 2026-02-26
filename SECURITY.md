# Seguridad de Autenticación

Este documento describe las características de seguridad implementadas en el sistema de autenticación.

## Características de Seguridad

### 1. Logging de Auditoría

Se registra cada intento de autenticación en la tabla `auth_logs`:

- ✅ Login exitoso
- ❌ Login fallido (con mensaje de error)
- 🚪 Logout

**Campos registrados:**
- `user_id`: UUID del usuario (si existe)
- `email`: Email del intento
- `action`: Tipo de acción (`login_success`, `login_failed`, `logout`)
- `ip_address`: Dirección IP del cliente (opcional)
- `user_agent`: Navegador/dispositivo utilizado
- `error_message`: Mensaje de error (solo en fallos)
- `created_at`: Timestamp del evento

**Retención de logs:** 90 días (configurable via función `cleanup_old_auth_logs()`)

### 2. Rate Limiting (Limitación de Intentos)

Sistema de protección contra ataques de fuerza bruta:

- **Máximo de intentos:** 5 intentos fallidos
- **Ventana de tiempo:** 15 minutos
- **Bloqueo temporal:** 5 minutos (300 segundos)
- **Persistencia:** El bloqueo se guarda en `localStorage` del navegador

**Comportamiento:**
1. Después de 1-4 intentos fallidos: Se muestra contador de intentos
2. Al 5to intento fallido: Se activa captcha reCAPTCHA + bloqueo temporal
3. Durante el bloqueo: Cuenta regresiva visible + formulario deshabilitado
4. **El bloqueo persiste al recargar la página** - No se puede bypassear con F5

**Implementación de Persistencia:**
- El estado de bloqueo se almacena en `localStorage` con timestamp de expiración
- Al recargar la página, se verifica si hay un bloqueo activo
- El bloqueo se limpia automáticamente al expirar o al login exitoso
- Incluye validación doble: estado React + localStorage (previene manipulación en DevTools)

**Servicios:**
- `src/services/rate-limit-storage.service.ts` - Manejo de persistencia en localStorage
- `src/services/auth-logs.service.ts` - Consultas a la base de datos de intentos fallidos

### 3. Google reCAPTCHA v2

Protección adicional que se activa automáticamente después de múltiples intentos fallidos.

**Configuración requerida:**
1. Obtener credenciales en [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Seleccionar reCAPTCHA v2 (checkbox "No soy un robot")
3. Agregar dominio(s) permitido(s)
4. Configurar variable de entorno:
   ```env
   VITE_RECAPTCHA_SITE_KEY=your-site-key-here
   ```

### 4. Visibilidad de Contraseña

Botón de "Mostrar/Ocultar contraseña" para mejorar la experiencia del usuario sin comprometer la seguridad.

**Implementación:**
- Icono de ojo (Eye/EyeOff de lucide-react)
- Toggle entre `type="password"` y `type="text"`
- Se deshabilita durante el bloqueo

## Instalación y Configuración

### 1. Ejecutar Migración de Base de Datos

```sql
-- Ejecutar en Supabase Dashboard → SQL Editor
-- O usar Supabase CLI: supabase db push
```

Migración: `supabase/migrations/036_create_auth_logs.sql`

Esta migración crea:
- Tabla `auth_logs` con índices optimizados
- Función `log_auth_attempt()` para registrar eventos
- Función `get_failed_login_attempts()` para consultar intentos fallidos
- Función `cleanup_old_auth_logs()` para limpieza automática
- Políticas RLS (solo admins pueden ver logs)

### 2. Configurar Variables de Entorno

Agregar en `.env.local`:

```env
# Google reCAPTCHA v2
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Importante:** No commitear este archivo. El `.env.example` ya está actualizado con la plantilla.

### 3. Instalar Dependencias

Las dependencias ya están instaladas:
```bash
npm install react-google-recaptcha @types/react-google-recaptcha
```

## Uso del Sistema

### Para Usuarios Finales

1. **Login normal:** Ingresar email y contraseña
2. **Error de credenciales:** Se muestra contador de intentos (X/5)
3. **Múltiples errores:** Aparece captcha después del 5to intento
4. **Bloqueo:** Esperar 5 minutos o hasta que el contador llegue a 0

### Para Administradores

**Ver logs de autenticación:**
```sql
-- Consulta directa en Supabase
SELECT * FROM auth_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Intentos fallidos por email
SELECT email, COUNT(*) as intentos
FROM auth_logs
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY email
ORDER BY intentos DESC;
```

**Limpiar logs antiguos:**
```sql
SELECT cleanup_old_auth_logs();
```

**Desbloquear usuario manualmente:**

Opción 1 - Limpiar base de datos (recomendado para admins):
```sql
-- Eliminar intentos fallidos recientes de un email específico
DELETE FROM auth_logs
WHERE email = 'usuario@example.com'
  AND action = 'login_failed'
  AND created_at > NOW() - INTERVAL '15 minutes';
```

Opción 2 - Limpiar localStorage del navegador del usuario:
```javascript
// El usuario puede abrir DevTools (F12) → Console y ejecutar:
localStorage.removeItem('auth_lockout')
// Luego recargar la página (F5)
```

⚠️ **Nota:** El bloqueo en localStorage expira automáticamente después de 5 minutos. Si el usuario limpia `localStorage` pero hay intentos fallidos en la BD, el bloqueo se reactivará al cambiar de email.

## Configuración Avanzada

### Personalizar Límites

En `src/components/pages/LoginPage.tsx`:

```typescript
const MAX_ATTEMPTS = 5           // Intentos antes de captcha/bloqueo
const LOCKOUT_DURATION = 300     // Duración del bloqueo (segundos)
```

En `src/services/auth-logs.service.ts`:

```typescript
// Ventana de tiempo para contar intentos fallidos
async getFailedLoginAttempts(email: string, minutes: number = 15)
```

### Retención de Logs

En la migración `036_create_auth_logs.sql`:

```sql
-- Cambiar el intervalo de retención (por defecto 90 días)
DELETE FROM public.auth_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Habilitar Captura de IP (Opcional)

Por defecto, la IP se registra como `NULL` para evitar llamadas externas.

Para habilitar:

1. **Opción A - Backend propio:**
   ```typescript
   // En auth-logs.service.ts
   const getClientIP = async (): Promise<string | null> => {
     const response = await fetch('/api/get-ip') // Tu endpoint
     const data = await response.json()
     return data.ip
   }
   ```

2. **Opción B - Servicio externo:**
   ```typescript
   const getClientIP = async (): Promise<string | null> => {
     const response = await fetch('https://api.ipify.org?format=json')
     const data = await response.json()
     return data.ip
   }
   ```

**Nota:** Considerar implicaciones de privacidad (GDPR/CCPA) al almacenar IPs.

## Políticas de Seguridad (RLS)

La tabla `auth_logs` tiene Row Level Security habilitado:

```sql
-- Solo admins pueden ver logs
CREATE POLICY "Only admins can view auth logs"
ON public.auth_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.personal
        WHERE id = auth.uid()
        AND rol = 'admin'
        AND activo = true
    )
);
```

**Importante:**
- Los logs NO son visibles para usuarios normales
- Solo usuarios con rol `admin` pueden consultar `auth_logs`
- Las funciones de logging usan `SECURITY DEFINER` para permitir inserts sin permisos directos

## Mejoras Futuras Recomendadas

1. **Multi-Factor Authentication (MFA)**
   - Integrar Supabase MFA nativo
   - SMS o Authenticator app

2. **Geolocalización de IPs**
   - Detectar intentos de países sospechosos
   - Alertas de login desde nueva ubicación

3. **Fingerprinting del dispositivo**
   - Identificar dispositivos conocidos
   - Alertar sobre nuevos dispositivos

4. **Rate limiting a nivel de infraestructura**
   - Cloudflare Rate Limiting
   - Supabase Edge Functions con rate limiting

5. **Notificaciones de seguridad**
   - Email al usuario en login exitoso desde nuevo dispositivo
   - Dashboard de actividad de cuenta

## Troubleshooting

### Captcha no aparece

1. Verificar variable de entorno `VITE_RECAPTCHA_SITE_KEY`
2. Verificar dominios autorizados en Google reCAPTCHA Admin
3. Revisar consola del navegador por errores de red

### Logs no se registran

1. Verificar que la migración se ejecutó correctamente
2. Comprobar que las funciones existen: `SELECT * FROM pg_proc WHERE proname LIKE 'log_auth%'`
3. Revisar logs de Supabase Dashboard → Database → Logs

### Usuario bloqueado permanentemente

1. Verificar temporizador en `lockoutTimer` state
2. Limpiar localStorage: `localStorage.clear()`
3. Eliminar logs de intentos fallidos (ver comando SQL arriba)

### Captcha válido pero sigue bloqueado

El bloqueo temporal es independiente del captcha. Debe esperar los 5 minutos completos después del 5to intento fallido.

## Contacto

Para reportar vulnerabilidades de seguridad, contactar al administrador del sistema.
