# Nuevas Funcionalidades Agregadas

Este documento resume las funcionalidades adicionales agregadas al esquema de base de datos.

## 1. Columna Sexo en Personal

### Descripción
Se agregó la columna `sexo` a la tabla `personal` para almacenar el género del personal.

### Detalles
- **Tipo:** `sexo_type` (enum)
- **Valores:** 'hombre' o 'mujer'
- **Requerido:** Sí (NOT NULL)
- **Archivo:** `003_create_personal.sql`

### Ejemplo de Uso
```sql
INSERT INTO personal (id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club)
VALUES (
  'auth-user-id',
  'Juan',
  'Pérez',
  30,
  'hombre',
  'Buenos Aires',
  'admin',
  'club-uuid'
);
```

---

## 2. Banner de Eventos (Storage)

### Descripción
Los eventos ahora pueden tener un banner/imagen asociada que se almacena en Supabase Storage.

### Detalles
- **Columna:** `banner_url` (TEXT, nullable)
- **Bucket:** `event-banners` (público)
- **Estructura:** `{uuid_club}/{nombre_archivo}`
- **Archivos:** `004_create_eventos.sql`, `010_create_storage_buckets.sql`

### Políticas de Storage
- ✅ Solo admins pueden subir/actualizar/eliminar banners de su club
- ✅ Todos pueden ver los banners (bucket público)
- ✅ Organizado por club (multi-tenant)

### Ejemplo de Uso

#### Subir Banner
```typescript
const { data, error } = await supabase.storage
  .from('event-banners')
  .upload(`${clubId}/${eventoId}.jpg`, file)

// Obtener URL pública
const { data: urlData } = supabase.storage
  .from('event-banners')
  .getPublicUrl(`${clubId}/${eventoId}.jpg`)

// Actualizar evento
await supabase
  .from('eventos')
  .update({ banner_url: urlData.publicUrl })
  .eq('id', eventoId)
```

#### Ver Banner en UI
```typescript
<img 
  src={evento.banner_url || '/default-banner.jpg'} 
  alt={evento.nombre}
  className="w-full h-48 object-cover"
/>
```

### Documentación Completa
Ver: `STORAGE_GUIDE.md`

---

## 3. Contador Auto-Incremental de Invitados

### Descripción
Los eventos ahora tienen un contador automático que se actualiza cada vez que se crea o elimina un invitado.

### Detalles
- **Columna:** `total_invitados` (INTEGER)
- **Default:** 0
- **Constraint:** >= 0 (no puede ser negativo)
- **Archivos:** `004_create_eventos.sql`, `008_create_triggers.sql`

### Funcionamiento
1. Cuando un RRPP crea un invitado → `total_invitados++`
2. Cuando un RRPP elimina un invitado → `total_invitados--`
3. Se actualiza automáticamente mediante triggers

### Triggers Implementados

#### Incrementar Contador
```sql
CREATE TRIGGER increment_total_invitados_trigger
    AFTER INSERT ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_total_invitados();
```

#### Decrementar Contador
```sql
CREATE TRIGGER decrement_total_invitados_trigger
    AFTER DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_total_invitados();
```

### Ejemplo de Uso

#### Ver Total de Invitados
```typescript
const { data: evento } = await supabase
  .from('eventos')
  .select('nombre, total_invitados')
  .eq('id', eventoId)
  .single()

console.log(`El evento ${evento.nombre} tiene ${evento.total_invitados} invitados`)
```

#### Dashboard de Eventos
```typescript
const { data: eventos } = await supabase
  .from('eventos')
  .select('id, nombre, fecha, total_invitados, estado')
  .eq('uuid_club', clubId)
  .order('fecha', { ascending: true })

eventos.forEach(evento => {
  console.log(`${evento.nombre}: ${evento.total_invitados} invitados`)
})
```

#### Componente React
```typescript
function EventoStats({ eventoId }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase
        .from('eventos')
        .select('total_invitados')
        .eq('id', eventoId)
        .single()

      // También obtener cuántos ingresaron
      const { count: ingresados } = await supabase
        .from('invitados')
        .select('*', { count: 'exact', head: true })
        .eq('uuid_evento', eventoId)
        .eq('ingresado', true)

      setStats({
        total: data.total_invitados,
        ingresados: ingresados,
        pendientes: data.total_invitados - ingresados
      })
    }
    
    loadStats()
  }, [eventoId])

  if (!stats) return <div>Cargando...</div>

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-title">Total Invitados</div>
        <div className="stat-value">{stats.total}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Ingresaron</div>
        <div className="stat-value text-success">{stats.ingresados}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Pendientes</div>
        <div className="stat-value text-warning">{stats.pendientes}</div>
      </div>
    </div>
  )
}
```

---

## Resumen de Cambios

### Tablas Modificadas

1. **personal**
   - ✅ Agregada columna `sexo` (sexo_type)

2. **eventos**
   - ✅ Agregada columna `banner_url` (TEXT)
   - ✅ Agregada columna `total_invitados` (INTEGER)
   - ✅ Constraint para `total_invitados >= 0`

3. **storage.objects**
   - ✅ Creado bucket `event-banners`
   - ✅ Políticas RLS para admins
   - ✅ Acceso público para lectura

### Nuevos Triggers

1. **increment_total_invitados_trigger**
   - Incrementa contador al crear invitado

2. **decrement_total_invitados_trigger**
   - Decrementa contador al eliminar invitado

### Archivos de Migración Actualizados

- `001_create_enums.sql` - Actualizado enum sexo_type
- `003_create_personal.sql` - Agregada columna sexo
- `004_create_eventos.sql` - Agregadas columnas banner_url y total_invitados
- `008_create_triggers.sql` - Agregados triggers de contador
- `010_create_storage_buckets.sql` - NUEVO archivo para storage

---

## Testing

### Probar Contador de Invitados

```sql
-- Crear evento
INSERT INTO eventos (nombre, fecha, uuid_club, created_by)
VALUES ('Test Event', NOW(), 'club-uuid', 'admin-uuid')
RETURNING id, total_invitados; -- Debería retornar 0

-- Agregar invitado
INSERT INTO invitados (nombre, apellido, dni, sexo, uuid_evento, id_rrpp)
VALUES ('Test', 'User', '12345678', 'hombre', 'evento-uuid', 'rrpp-uuid');

-- Verificar contador
SELECT total_invitados FROM eventos WHERE id = 'evento-uuid'; -- Debería retornar 1

-- Agregar más invitados
INSERT INTO invitados (nombre, apellido, dni, sexo, uuid_evento, id_rrpp)
VALUES ('Test2', 'User2', '87654321', 'mujer', 'evento-uuid', 'rrpp-uuid');

-- Verificar contador
SELECT total_invitados FROM eventos WHERE id = 'evento-uuid'; -- Debería retornar 2

-- Eliminar invitado
DELETE FROM invitados WHERE dni = '12345678' AND uuid_evento = 'evento-uuid';

-- Verificar contador
SELECT total_invitados FROM eventos WHERE id = 'evento-uuid'; -- Debería retornar 1
```

---

## Próximos Pasos

1. Ejecutar todas las migraciones en orden
2. Configurar las variables de entorno para Supabase
3. Implementar el código frontend según STORAGE_GUIDE.md
4. Probar la funcionalidad de subida de banners
5. Verificar que los contadores funcionan correctamente
