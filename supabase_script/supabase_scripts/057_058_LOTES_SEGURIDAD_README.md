# Migraciones 057-058: Asignación de Seguridad a Lotes

## Descripción General

Estas migraciones implementan un sistema de asignación de personal de seguridad a lotes específicos, donde **solo el seguridad asignado** puede escanear QR codes de invitados de ese lote.

## Estructura del Sistema

### Relación Muchos a Muchos

```
lotes (1) ←→ (N) lotes_seguridad (N) ←→ (1) personal
```

- Un lote puede tener **múltiples seguridades** asignados
- Un seguridad puede estar asignado a **múltiples lotes**

### Control de Acceso

Cuando un seguridad intenta escanear un QR:
1. Se valida que el invitado pertenezca a su club
2. Si el invitado tiene un lote asignado, se verifica que el seguridad esté asignado a ese lote
3. Si no está asignado → **Error: "Este cliente pertenece al {nombre_lote}"**
4. Si está asignado → Permite marcar ingreso o rechazo

## Migración 057: Estructura Base

### Tabla: `lotes_seguridad`

```sql
CREATE TABLE public.lotes_seguridad (
    id UUID PRIMARY KEY,
    uuid_lote UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    id_seguridad UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(uuid_lote, id_seguridad)
);
```

### Validaciones Automáticas

**Trigger: `validate_lotes_seguridad_role()`**
- Valida que `id_seguridad` tenga rol = 'seguridad'
- Valida que seguridad y lote pertenezcan al mismo club
- Se ejecuta en INSERT/UPDATE

### Políticas RLS

| Operación | Permitido Para | Restricción |
|-----------|---------------|-------------|
| SELECT | Todos los usuarios | Solo asignaciones de su club |
| INSERT | Admin | Solo lotes de su club |
| UPDATE | Admin | Solo asignaciones de su club |
| DELETE | Admin | Solo asignaciones de su club |

### Función RPC: `check_seguridad_can_scan(p_qr_code TEXT)`

**Propósito**: Validar si un seguridad puede escanear un invitado específico

**Retorna JSON**:
```json
// Éxito
{
  "success": true,
  "invitado_id": "uuid",
  "lote_nombre": "VIP Gold",
  "message": "Escaneo autorizado"
}

// Error - No asignado
{
  "success": false,
  "error": "Este cliente pertenece al VIP Gold",
  "lote_nombre": "VIP Gold",
  "invitado_id": "uuid"
}

// Sin lote (backward compatibility)
{
  "success": true,
  "invitado_id": "uuid",
  "message": "Invitado sin lote asignado - escaneo permitido"
}
```

## Migración 058: Integración con Funciones de Escaneo

### Funciones Actualizadas

#### 1. `rechazar_invitado(p_qr_code, p_razon, p_detalle)`

**Cambios**:
- ✅ Valida asignación de lote antes de rechazar
- ✅ Retorna mensaje con nombre del lote si no está asignado
- ✅ Mantiene toda la funcionalidad original (validación de club, rol, etc.)

**Flujo**:
```
1. Validar usuario autenticado y rol = 'seguridad'
2. Buscar invitado por QR
3. Validar club
4. SI tiene lote asignado → Validar que seguridad esté asignado
5. Marcar como rechazado con razón
```

#### 2. `marcar_ingreso(p_qr_code)` **[NUEVA]**

**Propósito**: Función centralizada para marcar ingreso de invitados

**Validaciones**:
- ✅ Usuario autenticado y rol = 'seguridad'
- ✅ Invitado existe y pertenece al club del seguridad
- ✅ Invitado NO está rechazado
- ✅ Invitado NO ha ingresado previamente
- ✅ Si tiene lote → Validar asignación de seguridad

**Retorna JSON**:
```json
// Éxito
{
  "success": true,
  "invitado_id": "uuid",
  "lote_nombre": "VIP Gold",
  "message": "Ingreso registrado exitosamente"
}

// Error - No asignado
{
  "success": false,
  "error": "Este cliente pertenece al VIP Gold",
  "lote_nombre": "VIP Gold"
}

// Error - Ya ingresó
{
  "success": false,
  "error": "Este invitado ya ha ingresado",
  "already_ingresado": true
}

// Error - Rechazado
{
  "success": false,
  "error": "Este invitado fue rechazado y no puede ingresar"
}
```

### Vista: `seguridad_lotes_asignados`

Vista con información completa de asignaciones:

```sql
SELECT * FROM public.seguridad_lotes_asignados;
```

**Columnas**:
- `id` - ID de la asignación
- `uuid_lote` - ID del lote
- `id_seguridad` - ID del seguridad
- `seguridad_nombre`, `seguridad_apellido` - Datos del seguridad
- `lote_nombre`, `lote_es_vip` - Datos del lote
- `uuid_evento`, `evento_nombre` - Datos del evento
- `uuid_club` - Club al que pertenece
- `created_at`, `updated_at` - Timestamps

### Función RPC: `get_my_assigned_lotes()`

**Propósito**: Permite a seguridad ver sus lotes asignados

**Retorna tabla**:
```sql
SELECT * FROM public.get_my_assigned_lotes();
```

**Columnas**:
- `uuid_lote` - ID del lote
- `lote_nombre` - Nombre del lote
- `lote_es_vip` - Si es VIP
- `cantidad_actual` - Invitados actuales
- `cantidad_maxima` - Capacidad máxima
- `uuid_evento` - ID del evento
- `evento_nombre` - Nombre del evento
- `evento_fecha` - Fecha del evento

**Solo retorna eventos activos** ordenados por fecha descendente.

## Ejecución de las Migraciones

### Orden de Ejecución

1. **Primero**: `057_create_lotes_seguridad_assignment.sql`
2. **Segundo**: `058_integrate_lotes_seguridad_with_scan_functions.sql`

### Pasos

1. Abrir Supabase Dashboard → SQL Editor
2. Copiar contenido de `057_create_lotes_seguridad_assignment.sql`
3. Ejecutar
4. Verificar que no hay errores
5. Copiar contenido de `058_integrate_lotes_seguridad_with_scan_functions.sql`
6. Ejecutar
7. Verificar con queries de verificación

### Queries de Verificación

```sql
-- 1. Verificar que la tabla existe
SELECT * FROM information_schema.tables
WHERE table_name = 'lotes_seguridad';

-- 2. Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'lotes_seguridad';

-- 3. Verificar políticas RLS
SELECT * FROM pg_policies
WHERE tablename = 'lotes_seguridad';

-- 4. Verificar funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_seguridad_can_scan',
    'rechazar_invitado',
    'marcar_ingreso',
    'get_my_assigned_lotes',
    'validate_lotes_seguridad_role'
)
ORDER BY routine_name;

-- 5. Verificar vista
SELECT * FROM information_schema.views
WHERE table_name = 'seguridad_lotes_asignados';

-- 6. Verificar triggers
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'lotes_seguridad';
```

## Uso desde el Frontend

### 1. Asignar Seguridad a Lote (Admin)

```typescript
// Admin interface to assign security to lotes
const assignSeguridadToLote = async (
  uuidLote: string,
  idSeguridad: string
) => {
  const { data, error } = await supabase
    .from('lotes_seguridad')
    .insert({
      uuid_lote: uuidLote,
      id_seguridad: idSeguridad
    });

  if (error) {
    if (error.message.includes('Solo personal con rol')) {
      toast.error('El personal debe tener rol "seguridad"');
    } else if (error.message.includes('mismo club')) {
      toast.error('El seguridad y el lote deben ser del mismo club');
    } else {
      toast.error('Error al asignar seguridad');
    }
    return;
  }

  toast.success('Seguridad asignado exitosamente');
};
```

### 2. Ver Asignaciones (Admin/RRPP)

```typescript
const fetchLotesSeguridad = async (eventoId: string) => {
  const { data, error } = await supabase
    .from('seguridad_lotes_asignados')
    .select('*')
    .eq('uuid_evento', eventoId);

  return data;
};
```

### 3. Ver Mis Lotes Asignados (Seguridad)

```typescript
const getMyAssignedLotes = async () => {
  const { data, error } = await supabase
    .rpc('get_my_assigned_lotes');

  if (error) {
    console.error('Error getting assigned lotes:', error);
    return [];
  }

  return data;
};
```

### 4. Verificar Permiso de Escaneo (Seguridad)

```typescript
const checkCanScan = async (qrCode: string) => {
  const { data, error } = await supabase
    .rpc('check_seguridad_can_scan', { p_qr_code: qrCode });

  if (error) {
    toast.error('Error al verificar permiso');
    return null;
  }

  const result = data as {
    success: boolean;
    error?: string;
    lote_nombre?: string;
    invitado_id?: string;
    message?: string;
  };

  if (!result.success) {
    toast.error(result.error || 'No autorizado');
    return null;
  }

  return result;
};
```

### 5. Marcar Ingreso (Seguridad)

```typescript
const marcarIngreso = async (qrCode: string) => {
  const { data, error } = await supabase
    .rpc('marcar_ingreso', { p_qr_code: qrCode });

  if (error) {
    toast.error('Error al marcar ingreso');
    return null;
  }

  const result = data as {
    success: boolean;
    error?: string;
    lote_nombre?: string;
    invitado_id?: string;
    already_ingresado?: boolean;
  };

  if (!result.success) {
    if (result.error?.includes('pertenece al')) {
      toast.error(result.error); // "Este cliente pertenece al VIP Gold"
    } else if (result.already_ingresado) {
      toast.warning('Este invitado ya ha ingresado');
    } else {
      toast.error(result.error || 'Error desconocido');
    }
    return null;
  }

  toast.success('Ingreso registrado');
  return result;
};
```

### 6. Rechazar Invitado (Seguridad)

```typescript
const rechazarInvitado = async (
  qrCode: string,
  razon: RazonRechazoType,
  detalle?: string
) => {
  const { data, error } = await supabase
    .rpc('rechazar_invitado', {
      p_qr_code: qrCode,
      p_razon: razon,
      p_detalle: detalle
    });

  if (error) {
    toast.error('Error al rechazar invitado');
    return null;
  }

  const result = data as {
    success: boolean;
    error?: string;
    lote_nombre?: string;
    invitado_id?: string;
  };

  if (!result.success) {
    if (result.error?.includes('pertenece al')) {
      toast.error(result.error); // "Este cliente pertenece al VIP Gold"
    } else {
      toast.error(result.error || 'Error desconocido');
    }
    return null;
  }

  toast.success('Invitado rechazado');
  return result;
};
```

## Cambios Requeridos en el Frontend

### Actualizar `database.ts`

```typescript
export interface LoteSeguridad {
  id: string;
  uuid_lote: string;
  id_seguridad: string;
  created_at: string;
  updated_at: string;
}

export interface SeguridadLoteAsignado {
  id: string;
  uuid_lote: string;
  id_seguridad: string;
  seguridad_nombre: string;
  seguridad_apellido: string;
  lote_nombre: string;
  lote_es_vip: boolean;
  uuid_evento: string;
  evento_nombre: string;
  uuid_club: string;
  created_at: string;
  updated_at: string;
}

export interface MyAssignedLote {
  uuid_lote: string;
  lote_nombre: string;
  lote_es_vip: boolean;
  cantidad_actual: number;
  cantidad_maxima: number;
  uuid_evento: string;
  evento_nombre: string;
  evento_fecha: string;
}
```

### Actualizar Scanner Page (Seguridad)

**Antes de marcar ingreso**, mostrar los lotes asignados al seguridad:

```typescript
const ScannerPage = () => {
  const [assignedLotes, setAssignedLotes] = useState<MyAssignedLote[]>([]);

  useEffect(() => {
    loadAssignedLotes();
  }, []);

  const loadAssignedLotes = async () => {
    const lotes = await getMyAssignedLotes();
    setAssignedLotes(lotes);
  };

  // Display assigned lotes at the top
  // When scanning, use marcar_ingreso() instead of direct UPDATE
};
```

### Crear Admin UI para Asignaciones

Crear una página en el panel de Admin para gestionar asignaciones:

```
/admin/eventos/{eventoId}/lotes/{loteId}/seguridad
```

Funcionalidades:
- Listar personal de seguridad del club
- Asignar/desasignar seguridad a lotes
- Ver asignaciones actuales por lote
- Ver asignaciones actuales por seguridad

## Backward Compatibility

**Invitados sin lote asignado**:
- El sistema permite escanear invitados que NO tienen `uuid_lote`
- Esto mantiene compatibilidad con datos existentes
- Mensaje: "Invitado sin lote asignado - escaneo permitido"

**Recomendación**: Asignar lotes a todos los invitados nuevos desde el frontend.

## Seguridad

### Aislamiento por Club

- ✅ Todas las validaciones verifican `uuid_club`
- ✅ No se puede asignar seguridad de un club a lotes de otro club
- ✅ Trigger automático valida club match

### SECURITY DEFINER

- ✅ Todas las funciones RPC usan `SECURITY DEFINER`
- ✅ Permite bypass de RLS para operaciones autorizadas
- ✅ Valida permisos manualmente dentro de la función

### Validaciones en Cascada

- `ON DELETE CASCADE` en FKs → Al eliminar lote o seguridad, se eliminan asignaciones
- Trigger `validate_lotes_seguridad_role` → Valida rol = 'seguridad'
- RLS policies → Solo admin puede crear/modificar asignaciones

## Rollback

Si necesitas revertir los cambios:

```sql
-- Rollback 058
DROP FUNCTION IF EXISTS public.marcar_ingreso(TEXT);
DROP FUNCTION IF EXISTS public.get_my_assigned_lotes();
DROP VIEW IF EXISTS public.seguridad_lotes_asignados;

-- Rollback 057
DROP FUNCTION IF EXISTS public.check_seguridad_can_scan(TEXT);
DROP TRIGGER IF EXISTS trigger_validate_lotes_seguridad_role ON public.lotes_seguridad;
DROP FUNCTION IF EXISTS validate_lotes_seguridad_role();
DROP TABLE IF EXISTS public.lotes_seguridad CASCADE;

-- Restaurar rechazar_invitado original (desde backup de 047)
```

## Testing

### Test Cases

1. **Admin asigna seguridad a lote** → ✅ Success
2. **Admin asigna usuario no-seguridad a lote** → ❌ Error: "Solo personal con rol seguridad"
3. **Admin asigna seguridad de otro club** → ❌ Error: "mismo club"
4. **Seguridad escanea invitado de su lote** → ✅ Success
5. **Seguridad escanea invitado de otro lote** → ❌ Error: "Este cliente pertenece al {lote}"
6. **Seguridad escanea invitado sin lote** → ✅ Success (backward compatibility)
7. **RRPP intenta asignar seguridad** → ❌ RLS Block
8. **Seguridad ve solo sus lotes asignados** → ✅ get_my_assigned_lotes()

### SQL Test Queries

```sql
-- 1. Crear asignación de prueba (como admin)
INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
VALUES ('uuid-lote-aqui', 'uuid-seguridad-aqui');

-- 2. Ver asignaciones
SELECT * FROM public.seguridad_lotes_asignados;

-- 3. Probar check_seguridad_can_scan (como seguridad)
SELECT public.check_seguridad_can_scan('QR-CODE-AQUI');

-- 4. Probar marcar_ingreso (como seguridad)
SELECT public.marcar_ingreso('QR-CODE-AQUI');

-- 5. Probar rechazar_invitado (como seguridad)
SELECT public.rechazar_invitado(
  'QR-CODE-AQUI',
  'codigo_vestimenta'::razon_rechazo_type,
  NULL
);

-- 6. Ver mis lotes asignados (como seguridad)
SELECT * FROM public.get_my_assigned_lotes();
```

## Soporte

Si encuentras problemas:

1. Verificar que las migraciones 057 y 058 se ejecutaron correctamente
2. Revisar logs de Supabase para errores RLS
3. Verificar que personal de seguridad tiene rol = 'seguridad'
4. Verificar que invitados tienen uuid_lote correcto
5. Verificar que seguridad y lote están en el mismo club

Para debugging, usar las queries de verificación incluidas en los archivos SQL.
