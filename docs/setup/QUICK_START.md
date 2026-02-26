# Guía de Inicio Rápido

Configuración inicial del sistema de gestión de eventos en 10 minutos.

## Prerrequisitos

- Node.js 18+ instalado
- Una cuenta en [Supabase](https://supabase.com)
- Git instalado

## Paso 1: Clonar el Proyecto

```bash
git clone <tu-repositorio>
cd onrrpp2
npm install
```

## Paso 2: Configurar Supabase

### 2.1 Crear Proyecto en Supabase

1. Ve a [app.supabase.com](https://app.supabase.com)
2. Crea un nuevo proyecto
3. Guarda las credenciales que aparecen

### 2.2 Aplicar Migraciones

**Opción A: Dashboard de Supabase (Recomendado)**

1. Ve a SQL Editor en tu proyecto Supabase
2. Ejecuta las migraciones en orden numérico:
   - `001_create_enums.sql` hasta `010_create_storage_buckets.sql`
   - Luego las migraciones de features (011+)

**Opción B: Supabase CLI**

```bash
cd supabase
supabase db push
```

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Obtén estos valores desde: Supabase Dashboard → Settings → API

## Paso 4: Crear Usuario de Prueba

1. Ve a Authentication → Users en Supabase Dashboard
2. Crea un usuario (Email + Password)
3. Copia el UUID del usuario
4. Ejecuta en SQL Editor:

```sql
-- Primero verifica que existe un club
SELECT id, nombre FROM public.clubs LIMIT 1;

-- Insertar usuario en personal (reemplaza los UUIDs)
INSERT INTO personal (id, nombre, apellido, edad, sexo, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-de-auth',
  'Admin',
  'Test',
  30,
  'hombre',
  'admin',
  'uuid-del-club',
  true
);
```

## Paso 5: Ejecutar la Aplicación

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## Paso 6: Iniciar Sesión

Usa el email y contraseña del usuario que creaste en el Paso 4.

## Verificación

Si todo está correcto, deberías:

- Ver el dashboard según tu rol (Admin, RRPP, Seguridad)
- Poder navegar entre las secciones
- Ver tu club en el header

## Siguiente Paso

Consulta la [Documentación Completa](../README.md) para conocer todas las funcionalidades.

## Problemas Comunes

### "Missing Supabase environment variables"
Verifica que el archivo `.env` existe y tiene las variables correctas.

### "Personal no encontrado"
El usuario existe en auth.users pero no en la tabla personal. Ejecuta el INSERT del Paso 4.

### "Usuario inactivo"
Actualiza el campo: `UPDATE personal SET activo = true WHERE id = 'tu-uuid';`

### Migraciones fallan
Ejecuta las migraciones en orden numérico estricto (001 → 002 → 003...).
