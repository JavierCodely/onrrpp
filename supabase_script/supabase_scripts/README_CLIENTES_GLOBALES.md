# Sistema de Clientes Globales

## 📋 Resumen

Este sistema separa los datos personales de los invitados en una **tabla global de clientes** compartida entre todos los clubs. Permite:

- ✅ **Auto-completado de datos entre clubs** - Si un RRPP ingresa un DNI que ya existe, se autocompletan todos los datos
- ✅ **Tracking de ingresos por club** - Cada cliente tiene un contador de cuántas veces ingresó a cada club
- ✅ **Trazabilidad** - Se registra qué RRPP creó originalmente cada cliente
- ✅ **Validación anti-duplicados** - Un cliente no puede tener múltiples entradas en el mismo lote

---

## 🗂️ Estructura de Tablas

### 1. `clientes` (GLOBAL - Sin uuid_club)

Tabla compartida entre TODOS los clubs.

```sql
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY,
    dni TEXT NOT NULL UNIQUE,              -- DNI único GLOBAL
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    edad INTEGER,
    fecha_nacimiento DATE,
    sexo sexo_type NOT NULL,
    departamento TEXT,
    localidad TEXT,
    id_rrpp_creador UUID NOT NULL,        -- Quién creó este cliente
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Características:**
- DNI único a nivel GLOBAL (no solo por club)
- Todos los usuarios pueden VER todos los clientes
- Solo RRPP y Admin pueden crear/editar clientes
- Se registra el `id_rrpp_creador` (el primer RRPP que ingresó ese DNI)

---

### 2. `clientes_ingresos_por_club`

Tabla que trackea cuántas veces un cliente ingresó a eventos de cada club.

```sql
CREATE TABLE public.clientes_ingresos_por_club (
    id UUID PRIMARY KEY,
    uuid_cliente UUID NOT NULL,
    uuid_club UUID NOT NULL,
    ingresos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE (uuid_cliente, uuid_club)
);
```

**Ejemplo de datos:**

| uuid_cliente | uuid_club | ingresos |
|--------------|-----------|----------|
| cliente-123  | club-A    | 5        |
| cliente-123  | club-B    | 2        |
| cliente-456  | club-A    | 1        |

**Interpretación:** El cliente-123 ingresó 5 veces a eventos del club-A y 2 veces a eventos del club-B.

---

### 3. `invitados` (Actualizada)

Se agrega la columna `uuid_cliente`:

```sql
ALTER TABLE public.invitados
ADD COLUMN uuid_cliente UUID REFERENCES public.clientes(id);

-- Constraint: Un cliente solo puede tener UNA entrada por lote
ADD CONSTRAINT cliente_lote_unico UNIQUE (uuid_cliente, uuid_lote);
```

**IMPORTANTE:** Por ahora, los campos `nombre`, `apellido`, `dni`, etc. se mantienen en `invitados` para compatibilidad. En la migración `046_cleanup_invitados_redundant_fields.sql` se pueden eliminar después de confirmar que todo funciona.

---

## 🔄 Flujo de Funcionamiento

### Escenario 1: RRPP crea invitado con DNI nuevo

1. RRPP ingresa DNI `12345678` + datos personales
2. **Trigger `auto_create_or_find_cliente`:**
   - Busca si existe cliente con ese DNI (GLOBALMENTE)
   - NO existe → Crea nuevo cliente en tabla `clientes` con `id_rrpp_creador = id_rrpp_actual`
   - Asigna `uuid_cliente` al invitado
3. Se crea el invitado normalmente

**Logs:**
```
✅ Nuevo cliente creado (DNI: 12345678) por RRPP: uuid-rrpp-123
```

---

### Escenario 2: RRPP de OTRO CLUB ingresa DNI existente

1. RRPP del Club B ingresa DNI `12345678` (ya existe en Club A)
2. **Trigger `auto_create_or_find_cliente`:**
   - Busca si existe cliente con ese DNI (GLOBALMENTE)
   - **SÍ existe** → Auto-completa todos los campos (nombre, apellido, edad, etc.)
   - Asigna `uuid_cliente` existente al invitado
3. Se crea el invitado con los datos autocompletados

**Logs:**
```
✅ Cliente existente encontrado (DNI: 12345678). Datos autocompletados.
```

**Resultado:** El RRPP del Club B ve automáticamente el nombre, apellido, edad, etc. del cliente sin tener que ingresarlos.

---

### Escenario 3: Cliente intenta duplicar entrada en el mismo lote

1. Cliente `uuid-cliente-123` ya tiene una entrada en el Lote "VIP Gold"
2. RRPP intenta crear otra entrada para el mismo cliente en el mismo lote
3. **Trigger `validar_cliente_lote_unico`:**
   - Detecta que ya existe una entrada para ese `uuid_cliente + uuid_lote`
   - **BLOQUEA** la operación con error descriptivo

**Error:**
```
❌ El cliente "Juan Pérez" ya tiene una entrada en el lote "VIP Gold".
   No se permiten entradas duplicadas por lote.
```

---

### Escenario 4: Cliente ingresa a un evento (QR scaneado)

1. Seguridad escanea QR del cliente
2. Se actualiza `invitados.ingresado = true`
3. **Trigger `incrementar_ingresos_cliente_por_club`:**
   - Obtiene el `uuid_club` del evento
   - Busca registro en `clientes_ingresos_por_club` para ese cliente + club
   - Si existe → Incrementa contador: `ingresos = ingresos + 1`
   - Si NO existe → Crea nuevo registro con `ingresos = 1`

**Logs:**
```
✅ Ingreso registrado para cliente uuid-cliente-123 en club uuid-club-A
```

**Resultado:** El contador de ingresos del cliente en ese club se incrementa automáticamente.

---

## 🚀 Orden de Ejecución de Migraciones

Para un **servidor nuevo desde cero**, ejecutar en este orden:

```bash
# 1. Core schema (001-041) - Ejecutar las migraciones existentes primero
supabase/migrations/001_create_enums.sql
supabase/migrations/002_create_clubs.sql
...
supabase/migrations/041_...sql

# 2. Sistema de clientes globales (NUEVO)
042_create_clientes_table.sql              # Crea tablas clientes + clientes_ingresos_por_club
043_update_invitados_with_clientes.sql     # Agrega uuid_cliente a invitados
044_create_cliente_triggers_and_validations.sql  # Crea triggers automáticos

# 3. Migración de datos (OPCIONAL - solo si tienes datos existentes)
045_migrate_existing_invitados_to_clientes.sql

# 4. Limpieza (OPCIONAL - solo después de confirmar que todo funciona)
046_cleanup_invitados_redundant_fields.sql  # Elimina campos redundantes de invitados
```

---

## 📊 Queries Útiles

### Ver todos los ingresos de un cliente en todos los clubs

```sql
SELECT
    c.dni,
    c.nombre,
    c.apellido,
    cl.nombre as club,
    cic.ingresos
FROM clientes c
JOIN clientes_ingresos_por_club cic ON c.id = cic.uuid_cliente
JOIN clubs cl ON cic.uuid_club = cl.id
WHERE c.dni = '12345678'
ORDER BY cic.ingresos DESC;
```

### Clientes que asistieron a múltiples clubs

```sql
SELECT
    c.dni,
    c.nombre,
    c.apellido,
    COUNT(DISTINCT cic.uuid_club) as clubs_visitados,
    SUM(cic.ingresos) as total_ingresos
FROM clientes c
JOIN clientes_ingresos_por_club cic ON c.id = cic.uuid_cliente
GROUP BY c.id, c.dni, c.nombre, c.apellido
HAVING COUNT(DISTINCT cic.uuid_club) > 1
ORDER BY clubs_visitados DESC;
```

### Ver quién creó un cliente

```sql
SELECT
    c.dni,
    c.nombre,
    c.apellido,
    p.nombre || ' ' || p.apellido as rrpp_creador,
    cl.nombre as club_del_rrpp,
    c.created_at
FROM clientes c
JOIN personal p ON c.id_rrpp_creador = p.id
JOIN clubs cl ON p.uuid_club = cl.id
WHERE c.dni = '12345678';
```

### Top clientes con más ingresos en MI club

```sql
SELECT
    c.dni,
    c.nombre,
    c.apellido,
    cic.ingresos
FROM clientes c
JOIN clientes_ingresos_por_club cic ON c.id = cic.uuid_cliente
WHERE cic.uuid_club = get_current_user_club()
ORDER BY cic.ingresos DESC
LIMIT 10;
```

---

## 🔐 Seguridad (RLS Policies)

### Tabla `clientes`

✅ **SELECT:** Todos los usuarios autenticados pueden ver TODOS los clientes
✅ **INSERT:** Solo RRPP y Admin pueden crear clientes
✅ **UPDATE:** Solo RRPP y Admin pueden actualizar clientes
✅ **DELETE:** Solo Admin puede eliminar clientes

### Tabla `clientes_ingresos_por_club`

✅ **SELECT:** Usuarios pueden ver ingresos de SU CLUB únicamente
✅ **INSERT/UPDATE/DELETE:** Solo sistema (triggers) puede modificar

---

## ⚠️ Consideraciones Importantes

### 1. DNI es ÚNICO a nivel GLOBAL

- Si un cliente tiene DNI `12345678` en el Club A, **NO puede existir** otro cliente con el mismo DNI en el Club B
- Esto permite compartir datos entre clubs automáticamente

### 2. Sincronización de datos

- Si un RRPP edita datos de un invitado (nombre, apellido, etc.), **se actualiza el cliente global**
- Esto afecta a TODOS los clubs que usen ese cliente
- **Ventaja:** Si un cliente cambió de teléfono/dirección, se actualiza automáticamente en todos lados

### 3. Validación por lote

- Un cliente puede tener **múltiples entradas en diferentes lotes** del mismo evento
- Un cliente **NO puede tener múltiples entradas en el MISMO lote**
- Ejemplo válido: Cliente tiene entrada en "Lote VIP" y "Lote General" del mismo evento
- Ejemplo inválido: Cliente tiene 2 entradas en "Lote VIP"

### 4. Contador de ingresos

- El contador `ingresos` en `clientes_ingresos_por_club` cuenta **eventos ingresados**, no entradas
- Si un cliente tiene 3 entradas en un evento pero solo ingresa con 1, suma +1 al contador
- Si un VIP ingresa múltiples veces (re-entry), suma +1 por cada ingreso

---

## 🧪 Testing

### Probar auto-completado entre clubs

```sql
-- 1. Como RRPP del Club A, crear invitado
INSERT INTO invitados (dni, nombre, apellido, sexo, uuid_evento, id_rrpp, uuid_lote)
VALUES ('12345678', 'Juan', 'Pérez', 'hombre', 'evento-club-a', 'rrpp-club-a', 'lote-1');

-- 2. Como RRPP del Club B, crear invitado con MISMO DNI
INSERT INTO invitados (dni, nombre, apellido, sexo, uuid_evento, id_rrpp, uuid_lote)
VALUES ('12345678', '', '', 'hombre', 'evento-club-b', 'rrpp-club-b', 'lote-2');
-- Los campos nombre/apellido se auto-completarán con 'Juan' 'Pérez'

-- 3. Verificar
SELECT * FROM clientes WHERE dni = '12345678';
-- Debe haber UN SOLO cliente
```

### Probar validación anti-duplicado

```sql
-- 1. Crear entrada
INSERT INTO invitados (dni, nombre, apellido, sexo, uuid_evento, id_rrpp, uuid_lote)
VALUES ('11111111', 'Ana', 'García', 'mujer', 'evento-1', 'rrpp-1', 'lote-vip');

-- 2. Intentar crear duplicado (mismo cliente, mismo lote)
INSERT INTO invitados (dni, nombre, apellido, sexo, uuid_evento, id_rrpp, uuid_lote)
VALUES ('11111111', 'Ana', 'García', 'mujer', 'evento-1', 'rrpp-1', 'lote-vip');
-- Debe FALLAR con error: "El cliente Ana García ya tiene una entrada en el lote..."
```

### Probar contador de ingresos

```sql
-- 1. Crear invitado
INSERT INTO invitados (dni, nombre, apellido, sexo, uuid_evento, id_rrpp, uuid_lote)
VALUES ('22222222', 'Carlos', 'López', 'hombre', 'evento-club-a', 'rrpp-1', 'lote-1')
RETURNING uuid_cliente;

-- 2. Marcar como ingresado
UPDATE invitados SET ingresado = true WHERE dni = '22222222';

-- 3. Verificar contador
SELECT * FROM clientes_ingresos_por_club WHERE uuid_cliente = 'uuid-obtenido-arriba';
-- Debe mostrar ingresos = 1 para el club del evento
```

---

## 📝 Notas para el Frontend

### Al crear un invitado:

1. El RRPP solo necesita ingresar el **DNI**
2. Si el DNI ya existe en la base de datos (incluso de otro club):
   - El backend auto-completa: nombre, apellido, edad, sexo, departamento, localidad
   - El frontend debe mostrar estos datos como "pre-cargados" pero editables
3. Si el DNI NO existe:
   - El frontend debe pedir todos los datos manualmente

### Validaciones frontend:

- Antes de crear un invitado, verificar si ese cliente ya tiene entrada en el lote seleccionado
- Query sugerido:
  ```sql
  SELECT EXISTS (
    SELECT 1 FROM invitados i
    JOIN clientes c ON i.uuid_cliente = c.id
    WHERE c.dni = '12345678' AND i.uuid_lote = 'uuid-lote-actual'
  );
  ```

### Ver historial de ingresos:

- Mostrar cuántas veces un cliente ingresó al club actual:
  ```sql
  SELECT ingresos FROM clientes_ingresos_por_club
  WHERE uuid_cliente = 'uuid' AND uuid_club = get_current_user_club();
  ```

---

## 🆘 Troubleshooting

### "El cliente ya tiene una entrada en el lote"

**Causa:** Estás intentando crear una segunda entrada para el mismo cliente en el mismo lote.

**Solución:** Verifica que el DNI no esté duplicado en ese lote. Si necesitas cambiar el lote, edita el invitado existente en lugar de crear uno nuevo.

---

### "Solo los RRPP pueden crear invitados"

**Causa:** El trigger `validate_rrpp_creates_invitado` verifica que `id_rrpp` sea de rol RRPP.

**Solución:** Asegúrate de que el usuario tenga rol `rrpp` en la tabla `personal`.

---

### Los datos no se autocompletan

**Causa:** El trigger `auto_create_or_find_cliente` no encontró un cliente con ese DNI.

**Solución:** Verifica que el DNI esté escrito correctamente (sin espacios ni guiones). El DNI debe ser EXACTAMENTE igual para que funcione el auto-completado.

---

### El contador de ingresos no se actualiza

**Causa:** El trigger `incrementar_ingresos_cliente_por_club` se ejecuta solo cuando `ingresado` cambia de `false` a `true`.

**Solución:** Asegúrate de que el campo `ingresado` esté cambiando de estado. Verifica que el trigger esté activo:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_incrementar_ingresos_cliente_por_club';
```

---

## 🎯 Ventajas del Sistema

✅ **Eficiencia:** No duplicar datos personales en la base de datos
✅ **Actualización global:** Un cambio en los datos del cliente se refleja en todos los clubs
✅ **Tracking avanzado:** Saber cuántas veces un cliente visitó cada club
✅ **Trazabilidad:** Saber qué RRPP creó cada cliente originalmente
✅ **Validación robusta:** Prevenir duplicados en el mismo lote
✅ **Auto-completado:** Acelerar el proceso de carga de invitados

---

## 📧 Soporte

Para preguntas o problemas con el sistema de clientes globales, contactar al equipo de desarrollo.
