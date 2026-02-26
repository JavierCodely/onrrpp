# Sistema de Gestión de Mesas - Resumen Ejecutivo

## Visión General

Sistema completo de gestión de mesas para nightclub con:
- **Gestión visual** de ubicaciones mediante coordenadas X/Y sobre planos
- **Escaneo diferenciado** (seguridad para entrada, bartender para consumiciones)
- **Tracking de comisiones** automático para RRPP
- **Actualización en tiempo real** con Supabase Realtime
- **Multi-tenant** con aislamiento por club (uuid_club)
- **Audit logging** inmutable de todos los escaneos

## Características Principales

### 1. Sectores Visuales
- Áreas físicas del club (VIP, Terraza, Salón Principal, etc.)
- Upload de imágenes de planos/layouts
- Asignación de personal de seguridad por sector

### 2. Mesas Configurables
- 3 estados: **libre** (🟢), **reservado** (🟡), **vendido** (🔴)
- Posicionamiento visual con coordenadas (0-100%)
- Límite de personas configurable (control de escaneos)
- Comisiones por monto fijo o porcentaje
- Consumiciones opcionales con detalle

### 3. Flujos de Venta
- **Reserva**: RRPP bloquea mesa temporalmente (sin QR, sin comisión)
- **Venta**: RRPP genera QR único + registra venta + calcula comisión
- **Liberación**: Revertir reserva a libre

### 4. Escaneo Seguridad (Entrada)
- Valida sector asignado
- Verifica límite de personas
- Registra ingreso (incrementa contador)
- Muestra ubicación exacta en plano
- Permite múltiples escaneos hasta max_personas

### 5. Escaneo Bartender (Consumiciones)
- Valida que la mesa tenga consumición
- Muestra detalle de lo que debe entregar
- Marca como entregada (timestamp + bartender_id)
- **Solo 1 escaneo por mesa** (bloqueo automático)

### 6. Realtime Updates
- Cambios de estado instantáneos
- Contadores en vivo
- Sincronización automática entre usuarios

## Arquitectura Técnica

### Base de Datos

```
sectores (áreas físicas)
  └─> mesas (posición X/Y, estado, precios)
       └─> ventas_mesas (1:1, QR único)
            └─> escaneos_mesas (historial inmutable)

sectores_seguridad (many-to-many)
  ├─> sectores
  └─> personal (rol = seguridad)
```

### Tablas Creadas (5)
1. **sectores** - Áreas físicas con imagen
2. **mesas** - Mesas con estado y configuración
3. **ventas_mesas** - Registro de ventas (1:1 con mesa)
4. **escaneos_mesas** - Audit log de escaneos
5. **sectores_seguridad** - Asignación seguridad ↔ sectores

### Funciones RPC (8)
1. `escanear_mesa_seguridad()` - Validar y registrar entrada
2. `escanear_mesa_bartender()` - Entregar consumición
3. `reservar_mesa()` - Bloquear mesa sin venta
4. `liberar_reserva_mesa()` - Liberar bloqueo
5. `vender_mesa()` - Crear venta con QR
6. `get_my_assigned_sectores()` - Ver sectores asignados (seguridad)
7. `get_seguridad_by_sector()` - Listar seguridad de un sector
8. `assign_seguridad_to_sector()` - Asignar múltiples seguridad (admin)

### Triggers Automáticos (6)
1. Incrementar contador al escanear seguridad
2. Bloquear re-escaneo de bartender
3. Cambiar mesa a vendido al crear venta
4. Prevenir eliminar venta con escaneos
5. Resetear mesa a libre al eliminar venta
6. Prevenir cambio a libre con venta activa

### Storage Buckets (1)
- `sectores-imagenes` - Planos/layouts de sectores (público)

## Roles y Permisos

### Admin
- ✅ Crear/editar sectores y mesas
- ✅ Configurar comisiones y consumiciones
- ✅ Asignar seguridad a sectores
- ✅ Agregar personal tipo bartender
- ✅ Ver reportes completos

### RRPP
- ✅ Ver sectores con plano visual
- ✅ Reservar/liberar mesas
- ✅ Vender mesas (genera QR)
- ✅ Ver sus propias ventas y comisiones
- ❌ No puede escanear QR
- ❌ No puede editar mesas vendidas

### Seguridad
- ✅ Escanear QR de entrada
- ✅ Ver ubicación de mesa en plano
- ✅ Solo sectores asignados (si hay asignaciones)
- ✅ Hasta max_personas por mesa
- ❌ No puede editar estado de mesas

### Bartender (Nuevo Rol)
- ✅ Escanear QR para consumiciones
- ✅ Marcar consumición como entregada
- ✅ Solo 1 escaneo por mesa
- ❌ No puede escanear sin consumición
- ❌ No puede re-escanear mesas entregadas

## Métricas y Reportes

### Disponibles Out-of-the-Box
- Mesas por estado (libre/reservado/vendido)
- Ocupación por mesa (escaneos vs max_personas)
- Consumiciones entregadas vs pendientes
- Ventas y comisiones por RRPP
- Historial de escaneos por personal
- Sectores con mayor actividad

### Queries de Ejemplo
Ver `TEST_QUERIES.sql` Sección 6: Reportes y Analytics

## Flujo de Uso Completo

```
1. ADMIN crea sector "VIP Principal"
   └─> Upload imagen del plano

2. ADMIN crea mesas en el sector
   └─> Mesa VIP-1 (coordenadas 25%, 30%)
   └─> Mesa VIP-2 (coordenadas 75%, 30%)
   └─> Configura: precio, comisiones, consumiciones

3. ADMIN asigna seguridad al sector
   └─> Juan Pérez, María González

4. RRPP vende Mesa VIP-1
   └─> Cliente: DNI 12345678
   └─> Se genera QR único
   └─> Mesa cambia a estado vendido (🔴)

5. CLIENTE llega al club con QR

6. SEGURIDAD escanea QR
   └─> Valida sector asignado
   └─> Registra ingreso (contador +1)
   └─> Muestra mapa: "Mesa VIP-1 está aquí ⭕"

7. BARTENDER escanea QR
   └─> Ve: "1 botella vodka + mixers"
   └─> Entrega consumición
   └─> Marca como entregada (QR bloqueado)

8. RRPP ve su comisión actualizada en tiempo real
```

## Ventajas del Sistema

### Para el Club
- ✅ Control total de ocupación por mesa
- ✅ Trazabilidad completa (quién, cuándo, dónde)
- ✅ Reducción de fraude (QR único + límites)
- ✅ Métricas en tiempo real

### Para los RRPP
- ✅ Comisiones automáticas (sin cálculos manuales)
- ✅ Historial de ventas completo
- ✅ Reservas sin compromiso (antes de venta)
- ✅ Seguimiento de consumiciones

### Para Seguridad
- ✅ Validación instantánea
- ✅ Mapa visual para guiar clientes
- ✅ Control de aforo por mesa
- ✅ Solo sectores asignados (menos confusión)

### Para Bartenders
- ✅ Detalle claro de qué entregar
- ✅ Confirmación en 1 escaneo
- ✅ Previene doble entrega
- ✅ Historial de entregas

## Seguridad y Auditoria

### Row Level Security (RLS)
- ✅ Todas las tablas tienen RLS habilitado
- ✅ Filtrado automático por uuid_club
- ✅ Permisos específicos por rol

### Audit Log Inmutable
- ✅ Tabla `escaneos_mesas` sin UPDATE/DELETE
- ✅ Registro permanente de:
  - Quién escaneó (id + nombre)
  - Qué escaneó (QR code)
  - Cuándo (timestamp)
  - Tipo (seguridad/bartender)

### Validaciones Automáticas
- ✅ Mesa libre no puede tener RRPP
- ✅ Mesa vendida debe tener comisión
- ✅ No se puede eliminar venta con escaneos
- ✅ No se puede re-escanear consumición entregada
- ✅ Límite de personas por mesa

### Protección de Datos
- ✅ Multi-tenant aislado por club
- ✅ QR únicos con timestamp
- ✅ Prevención de concurrencia con SECURITY DEFINER

## Consideraciones de Implementación

### Backend (Supabase)
- ✅ 8 migraciones SQL en orden (061-068)
- ✅ Ejecutar en entorno de desarrollo primero
- ✅ Verificar con TEST_QUERIES.sql
- ⚠️ Rollback de enum bartender es complejo

### Frontend (React)
- 📦 Crear servicios TypeScript (sectores, mesas, ventas)
- 📦 Implementar mapa visual con coordenadas
- 📦 Scanners QR diferenciados por rol
- 📦 Subscripciones Realtime para actualizaciones en vivo
- 📦 UI de círculos de colores (verde/amarillo/rojo)

### Performance
- ✅ Todos los FK tienen índices
- ✅ Realtime con filtros específicos
- ✅ Contadores sin problemas de concurrencia
- ✅ Queries optimizadas para reportes

## Próximos Pasos

### Fase 1: Instalación (Backend)
1. Ejecutar migraciones 061-068 en orden
2. Verificar instalación con TEST_QUERIES.sql
3. Crear bartenders en tabla personal
4. Probar funciones RPC en Supabase Dashboard

### Fase 2: Frontend Básico
1. Crear servicios TypeScript
2. Componente de mapa visual con SVG/Canvas
3. Formularios de reserva y venta
4. Scanners QR (seguridad + bartender)

### Fase 3: Realtime y UX
1. Implementar subscripciones Realtime
2. Notificaciones push de escaneos
3. Animaciones de estado
4. Dashboard de métricas en vivo

### Fase 4: Reportes y Analytics
1. Dashboard de admin con gráficas
2. Exportación de datos (CSV/PDF)
3. Reportes de comisiones por período
4. Heatmap de ocupación por sector

## KPIs del Sistema

### Operacionales
- Mesas vendidas / Total mesas
- Ocupación promedio por mesa
- Tiempo promedio de escaneo
- Consumiciones entregadas a tiempo

### Financieros
- Revenue por sector
- Comisiones totales por RRPP
- Ticket promedio por mesa
- Conversión reserva → venta

### Personal
- Escaneos por seguridad
- Consumiciones por bartender
- Eficiencia por turno

## Soporte y Documentación

### Archivos Incluidos
- `README.md` - Documentación técnica completa
- `RESUMEN_EJECUTIVO.md` - Este documento
- `TEST_QUERIES.sql` - Queries de prueba y validación
- `061-068_*.sql` - Migraciones SQL

### Contacto
Para soporte técnico, incluir:
- Logs de error completos
- Rol del usuario (admin/rrpp/seguridad/bartender)
- Consulta SQL que falló (si aplica)
- Contexto del flujo donde ocurrió el error

## Conclusión

Este sistema proporciona una solución completa y robusta para la gestión de mesas en nightclubs, con foco en:
- ✅ **Seguridad**: RLS + audit log + validaciones
- ✅ **Experiencia de Usuario**: Visual, intuitivo, tiempo real
- ✅ **Trazabilidad**: Historial completo de todas las acciones
- ✅ **Escalabilidad**: Multi-tenant, optimizado, extensible

El sistema está listo para producción una vez completada la instalación de las 8 migraciones y el desarrollo del frontend correspondiente.

---

**Versión**: 1.0
**Fecha**: 2026-01-29
**Autor**: Claude Supabase Expert
**Migraciones**: 061-068
