# Resumen Completo del Schema de Base de Datos

## Tablas Principales

### 1. clubs
- id, nombre, activo

### 2. personal (con auth.users)
- id, nombre, apellido, edad
- **sexo** (hombre/mujer) - NUEVO
- ubicacion, rol, uuid_club, activo

### 3. eventos
- id, nombre, fecha
- **banner_url** - URL del banner - NUEVO
- **total_invitados** - Contador auto - NUEVO
- **total_ingresados** - Contador auto - NUEVO
- uuid_club, estado, created_by

### 4. invitados
- id, nombre, apellido, edad, ubicacion
- dni, sexo, uuid_evento, id_rrpp
- ingresado, fecha_ingreso

## Contadores Automaticos

### total_invitados
- +1 cuando RRPP crea invitado
- -1 cuando RRPP elimina invitado

### total_ingresados
- +1 cuando Seguridad marca ingresado = true
- -1 cuando se desmarca o elimina invitado ingresado

## Storage para Banners

- Bucket: event-banners
- Estructura: {uuid_club}/{archivo}
- Solo admins pueden subir
- Publico para lectura

## Ejemplo de Uso

Ver evento con estadisticas:
```sql
SELECT 
  nombre,
  total_invitados,
  total_ingresados,
  (total_invitados - total_ingresados) as pendientes
FROM eventos
WHERE id = 'evento-uuid';
```

## Archivos Creados

- 001 a 010: Migraciones SQL
- README.md: Documentacion principal
- SCHEMA_DIAGRAM.md: Diagramas
- STORAGE_GUIDE.md: Guia de Storage
- RESUMEN_COMPLETO.md: Este archivo

## Ejecutar Migraciones

```bash
supabase db push
```

O ejecutar cada archivo SQL en orden en el Dashboard de Supabase.
