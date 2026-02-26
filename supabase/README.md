# Supabase Database Schema - Sistema Multi-Tenant de Gestión de Eventos

Este directorio contiene todos los scripts SQL para la base de datos PostgreSQL de Supabase.

## 📋 Descripción del Sistema

Sistema multi-tenant para gestión de eventos con 3 roles:
- **Admin**: Crea y gestiona eventos
- **RRPP**: Gestiona listas de invitados por evento
- **Seguridad**: Valida el ingreso de invitados

Cada club es independiente (multi-tenant) y los usuarios solo pueden ver/modificar datos de su propio club.

## 🗂️ Estructura de Directorios

```
supabase/
├── migrations/          # Migraciones SQL en orden de ejecución
│   ├── 001_create_enums.sql
│   ├── 002_create_clubs.sql
│   ├── 003_create_personal.sql
│   ├── 004_create_eventos.sql
│   ├── 005_create_invitados.sql
│   ├── 006_create_functions.sql
│   ├── 007_create_rls_policies.sql
│   └── 008_create_triggers.sql
├── functions/           # Funciones PostgreSQL auxiliares
└── policies/            # Políticas RLS por tabla
```

## 📊 Esquema de Base de Datos

### Tablas Principales

#### 1. **clubs**
Tabla base para multi-tenant
- `id` (UUID) - Primary Key
- `nombre` (TEXT)
- `activo` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 2. **personal**
Personal del club (integrado con Supabase Auth)
- `id` (UUID) - References auth.users
- `nombre`, `apellido` (TEXT)
- `edad` (INTEGER)
- `ubicacion` (TEXT)
- `rol` (user_role: 'admin', 'rrpp', 'seguridad')
- `uuid_club` (UUID) - References clubs
- `activo` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 3. **eventos**
Eventos del club (solo admins pueden crear)
- `id` (UUID) - Primary Key
- `nombre` (TEXT)
- `fecha` (TIMESTAMPTZ)
- `uuid_club` (UUID) - References clubs
- `estado` (BOOLEAN)
- `created_by` (UUID) - References personal
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 4. **invitados**
Lista de invitados por evento (gestionada por RRPP)
- `id` (UUID) - Primary Key
- `nombre`, `apellido` (TEXT)
- `edad` (INTEGER)
- `ubicacion` (TEXT)
- `dni` (TEXT) - Único por evento
- `sexo` (sexo_type)
- `uuid_evento` (UUID) - References eventos
- `id_rrpp` (UUID) - References personal
- `ingresado` (BOOLEAN) - Marcado por seguridad
- `fecha_ingreso` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)

## 🔒 Seguridad (RLS Policies)

### Multi-Tenant Isolation
Todos los usuarios solo pueden acceder a datos de su propio club mediante:
- `get_current_user_club()` - Retorna el club del usuario autenticado
- `get_current_user_role()` - Retorna el rol del usuario autenticado

### Permisos por Rol

**Admin:**
- ✅ Ver eventos de su club
- ✅ Crear eventos para su club
- ✅ Actualizar/eliminar sus propios eventos
- ✅ Ver invitados de eventos de su club

**RRPP:**
- ✅ Ver eventos de su club
- ✅ Ver invitados de su club
- ✅ Crear invitados para eventos de su club
- ✅ Actualizar/eliminar sus propios invitados
- ❌ No puede modificar estado de ingreso

**Seguridad:**
- ✅ Ver eventos de su club
- ✅ Ver invitados de su club
- ✅ Marcar invitados como ingresados
- ❌ No puede crear/eliminar invitados

## 🚀 Cómo Ejecutar las Migraciones

### Opción 1: Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Iniciar sesión
supabase login

# 3. Link al proyecto
supabase link --project-ref tu-project-id

# 4. Ejecutar migraciones
supabase db push
```

### Opción 2: Supabase Dashboard

1. Ve a tu proyecto en https://app.supabase.com
2. Navega a "SQL Editor"
3. Ejecuta cada archivo en orden (001 a 008)

### Opción 3: Script de Ejecución Manual

```bash
# Ejecutar todas las migraciones en orden
for file in supabase/migrations/*.sql; do
  echo "Ejecutando $file..."
  psql -h db.xxx.supabase.co -U postgres -d postgres -f "$file"
done
```

## 📝 Funciones Importantes

### `get_current_user_club()`
Retorna el UUID del club del usuario autenticado.

### `get_current_user_role()`
Retorna el rol del usuario autenticado.

### `check_user_has_role(rol)`
Verifica si el usuario tiene un rol específico.

### `mark_invitado_ingresado(invitado_id)`
Marca un invitado como ingresado (solo seguridad).

## 🔄 Triggers Automáticos

1. **updated_at**: Se actualiza automáticamente en todas las tablas
2. **validate_admin_creates_evento**: Valida que solo admins creen eventos
3. **validate_rrpp_creates_invitado**: Valida que solo RRPP creen invitados
4. **auto_set_fecha_ingreso**: Establece automáticamente fecha de ingreso

## 📱 Flujo de Trabajo

### 1. Admin crea un evento
```sql
INSERT INTO eventos (nombre, fecha, uuid_club, created_by)
VALUES ('Fiesta de Año Nuevo', '2025-12-31 23:00:00', 'club-uuid', auth.uid());
```

### 2. RRPP arma lista de invitados
```sql
INSERT INTO invitados (nombre, apellido, dni, sexo, uuid_evento, id_rrpp)
VALUES ('Juan', 'Pérez', '12345678', 'masculino', 'evento-uuid', auth.uid());
```

### 3. Seguridad marca ingreso
```sql
SELECT mark_invitado_ingresado('invitado-uuid');
-- O directamente:
UPDATE invitados SET ingresado = true WHERE id = 'invitado-uuid';
```

## 🔍 Consultas Útiles

### Ver eventos activos del club
```sql
SELECT * FROM eventos 
WHERE estado = true 
AND uuid_club = get_current_user_club()
ORDER BY fecha DESC;
```

### Ver invitados de un evento
```sql
SELECT 
  i.*,
  p.nombre || ' ' || p.apellido as rrpp_nombre
FROM invitados i
JOIN personal p ON i.id_rrpp = p.id
WHERE i.uuid_evento = 'evento-uuid'
ORDER BY i.ingresado, i.apellido;
```

### Estadísticas de un evento
```sql
SELECT 
  COUNT(*) as total_invitados,
  COUNT(*) FILTER (WHERE ingresado = true) as ingresados,
  COUNT(*) FILTER (WHERE ingresado = false) as pendientes
FROM invitados
WHERE uuid_evento = 'evento-uuid';
```

## ⚠️ Consideraciones Importantes

1. **Autenticación**: Todos los usuarios deben autenticarse con Supabase Auth
2. **Registro de Personal**: Primero crear usuario en auth.users, luego en personal
3. **Multi-tenant**: NUNCA desactivar RLS en producción
4. **DNI Único**: Un DNI puede aparecer en múltiples eventos, pero no duplicado en el mismo evento
5. **Cascadas**: Al eliminar un club, se eliminan todos sus datos relacionados

## 📞 Soporte

Para reportar problemas o mejoras en el esquema de base de datos, crear un issue en el repositorio.
