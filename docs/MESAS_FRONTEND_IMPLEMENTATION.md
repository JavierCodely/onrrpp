# Implementación Frontend - Sistema de Mesas

## Archivos Creados

### 1. Tipos (database.ts)
**Ubicación**: `src/types/database.ts`

Se agregaron los siguientes tipos al final del archivo:
- `EstadoMesa`: 'libre' | 'reservado' | 'vendido'
- `Sector`: Sectores con imagen (1080x1920)
- `Mesa`: Mesas con coordenadas X/Y (0-100%)
- `VentaMesa`: Ventas de mesas con datos del cliente
- `SectorConMesas`: Sector con estadísticas de mesas
- `MesaConDetalles`: Mesa con información completa de venta
- `VentaMesaResult`: Resultado de operaciones RPC
- `SectorSeguridad`: Asignaciones de seguridad a sectores
- `SectorSeguridadConDetalles`: Asignaciones con detalles completos
- `UserRole`: Actualizado para incluir 'bartender'

### 2. Servicios

#### `src/services/sectores.service.ts`
Servicio singleton para gestión de sectores:
- `getSectoresByEvento()`: Obtener sectores de un evento
- `getSectorById()`: Obtener sector por ID
- `getSectorConMesas()`: Sector con mesas y estadísticas
- `createSector()`: Crear sector con imagen (valida 1080x1920)
- `updateSector()`: Actualizar nombre/imagen
- `deleteSector()`: Eliminar sector (cascada elimina mesas)
- `subscribeToSectores()`: Realtime para sectores
- `validateImageDimensions()`: Validación 1080x1920 píxeles

#### `src/services/mesas.service.ts`
Servicio singleton para gestión de mesas:
- `getMesasBySector()`: Mesas de un sector
- `getMesasByEvento()`: Todas las mesas de un evento
- `getMesaById()`: Mesa por ID
- `getMesaConDetalles()`: Mesa con sector y venta completa
- `createMesa()`: Crear mesa con configuración
- `updateMesa()`: Actualizar datos de mesa
- `deleteMesa()`: Eliminar mesa
- `updatePosicion()`: Actualizar coordenadas X/Y
- `subscribeToMesas()`: Realtime para mesas

#### `src/services/ventas-mesas.service.ts`
Servicio singleton para ventas de mesas:
- `getVentasByRRPP()`: Ventas de un RRPP
- `getVentasByEvento()`: Ventas de un evento
- `getVentaByQR()`: Venta por código QR
- `getVentasPendientesEntrega()`: Ventas sin consumición entregada
- `getHistorialEntregas()`: Historial de entregas de bartender
- `subscribeToVentasMesas()`: Realtime para ventas

#### `src/services/mesas-rpc.service.ts`
Servicio singleton para llamadas RPC:
- `reservarMesa()`: Cambiar estado a 'reservado'
- `venderMesa()`: Crear venta y cambiar estado a 'vendido'
- `cancelarReservaMesa()`: Volver a 'libre'
- `entregarConsumicionMesa()`: Marcar consumición entregada

#### `src/services/sectores-seguridad.service.ts`
Servicio singleton para asignaciones de seguridad:
- `getAsignacionesBySector()`: Asignaciones de un sector
- `getAsignacionesByEvento()`: Asignaciones de un evento
- `getSeguridadesDisponibles()`: Personal de seguridad disponible
- `assignSeguridadToSector()`: Asignar seguridad a sector
- `unassignSeguridadFromSector()`: Quitar asignación
- `subscribeToAsignaciones()`: Realtime

### 3. Hooks

#### `src/features/mesas/hooks/useSectores.ts`
- `useSectores()`: Hook con realtime para sectores de un evento
- `useSectorConMesas()`: Hook para sector individual con mesas

#### `src/features/mesas/hooks/useMesas.ts`
- `useMesas()`: Hook con realtime para mesas (por evento o sector)
- `useMesaConDetalles()`: Hook para mesa individual con detalles

#### `src/features/mesas/hooks/useMesaInteraction.ts`
Hook para interacciones con mesas:
- `reservarMesa()`: Reservar con toast
- `venderMesa()`: Vender con toast y callback de QR
- `cancelarReserva()`: Cancelar con toast
- `entregarConsumicion()`: Entregar con toast

#### `src/features/mesas/hooks/index.ts`
Exporta todos los hooks

### 4. Componentes Compartidos

#### `src/features/mesas/components/MesaCircle.tsx`
Círculo visual de mesa con:
- Colores por estado (verde/amarillo/rojo)
- Drag & drop para admin (reposicionar)
- Animaciones con framer-motion
- Click handler para ver detalles

#### `src/features/mesas/components/SectorMapView.tsx`
Vista de mapa de sector con:
- Imagen de fondo (1080x1920)
- Mesas posicionadas por coordenadas
- Leyenda de colores
- Soporte para modo admin/RRPP

#### `src/features/mesas/components/MesaDetailDialog.tsx`
Modal de detalles de mesa con:
- Información completa (capacidad, precio, comisión, consumición)
- Información de venta si existe
- Botones contextuales por estado (Reservar, Vender, Cancelar, Ver QR)

#### `src/features/mesas/components/index.ts`
Exporta todos los componentes

### 5. Páginas - Admin

#### `src/components/pages/admin/SectoresPage.tsx`
Gestión de sectores:
- Selección de evento
- Grid de sectores con preview de imagen
- Crear/editar sectores
- Validación de imagen 1080x1920
- Upload a Supabase Storage bucket 'sectores-images'
- Eliminar sectores con confirmación

#### `src/components/pages/admin/MesasAdminPage.tsx`
Gestión de mesas:
- Selección de evento y sector
- Vista de mapa con drag & drop para reposicionar
- Crear/editar mesas con formulario completo
- Lista de mesas con datos resumidos
- Eliminar mesas (solo si estado='libre')

### 6. Páginas - RRPP

#### `src/components/pages/rrpp/MesasRRPPPage.tsx`
Reserva y venta de mesas:
- Selección de evento y sector
- Vista de mapa interactivo
- Click en mesa para ver detalles
- Reservar mesas (libre → reservado)
- Vender mesas (libre/reservado → vendido)
- Cancelar reservas
- Ver QR de mesas vendidas
- Estadísticas de estado de mesas

#### `src/components/pages/rrpp/VenderMesaDialog.tsx`
Modal de venta de mesa:
- Formulario de datos del cliente
- Campos: nombre, apellido, DNI, teléfono, email, cantidad personas
- Resumen de venta (precio, comisión, consumición)
- Callback con QR code al confirmar venta
- Botón fixed bottom en mobile

### 7. Páginas - Bartender

#### `src/components/pages/bartender/BartenderScannerPage.tsx`
Escáner de QR para consumiciones:
- Escáner Html5Qrcode con auto-start
- Procesa QR de ventas de mesas
- Valida estado de consumición
- Marca consumición como entregada
- Muestra información de la venta
- Contador de espera (3s) entre escaneos
- Feedback visual de éxito/error

#### `src/components/pages/bartender/BartenderHistorialPage.tsx`
Historial de entregas:
- Lista de consumiciones entregadas
- Filtro por evento
- Información completa de cada entrega
- Estadísticas: total entregas, personas atendidas, ventas totales

### 8. Layout - Bartender

#### `src/components/organisms/BartenderLayout.tsx`
Layout para rol bartender:
- Header con logout
- Bottom navigation mobile (Escáner/Historial)
- Sidebar desktop (Escáner/Historial)
- Patrón similar a RRPPLayout

### 9. Routers Actualizados

#### `src/components/pages/DashboardRouter.tsx`
Agregado caso 'bartender':
```typescript
case 'bartender':
  return <BartenderDashboard />
```

#### `src/components/pages/BartenderDashboard.tsx`
Nuevo dashboard para bartender:
- Rutas: /scanner, /historial
- Default: redirige a /scanner

#### `src/components/pages/AdminDashboard.tsx`
Agregadas rutas:
- `/sectores` → SectoresPage
- `/mesas` → MesasAdminPage

#### `src/components/pages/RRPPDashboard.tsx`
Agregada ruta:
- `/mesas` → MesasRRPPPage

### 10. Navegación Actualizada

#### `src/components/organisms/BottomNavigation.tsx`
Agregado botón Mesas:
- Icono: Grid3x3
- Path: /dashboard/rrpp/mesas
- Reordenado: Eventos, Entradas, Mesas, Ventas, Perfil

#### `src/components/organisms/AdminLayout.tsx`
Agregados menú items:
- Sectores (MapPin icon)
- Mesas (Grid3x3 icon)

## Próximos Pasos

### 1. Backend - Ejecutar Migraciones SQL
Ejecutar en orden en Supabase Dashboard SQL Editor:
- `062_create_sectores_table.sql`
- `063_create_mesas_table.sql`
- `064_create_mesas_ventas.sql`
- `065_create_mesas_triggers.sql`
- `066_create_mesas_functions.sql`
- `067_create_sectores_images_bucket.sql`
- `068_create_sectores_seguridad_assignment.sql`

### 2. Crear Storage Bucket
En Supabase Dashboard → Storage:
- Crear bucket `sectores-images` (público)
- Configurar políticas de acceso según rol

### 3. Actualizar .env (si es necesario)
No se requieren nuevas variables de entorno.

### 4. Testing
Probar flujo completo:

#### Admin:
1. Crear evento activo
2. Ir a Sectores → crear sector con imagen 1080x1920
3. Ir a Mesas → seleccionar evento/sector
4. Crear mesas arrastrando en el mapa
5. Ajustar precio, capacidad, comisión, consumición

#### RRPP:
1. Ir a Mesas
2. Seleccionar evento y sector
3. Click en mesa libre → Reservar
4. Click en mesa reservada → Vender (completar formulario)
5. Ver QR generado
6. Click en mesa vendida → Ver QR nuevamente

#### Bartender:
1. Ir a Escáner
2. Escanear QR de mesa vendida
3. Verificar que se marca consumición como entregada
4. Ir a Historial → ver la entrega registrada
5. Validar estadísticas

### 5. Validaciones a Verificar
- Imagen de sector debe ser exactamente 1080x1920
- No se pueden eliminar mesas reservadas/vendidas
- No se pueden vender mesas ya vendidas
- No se pueden reservar mesas vendidas
- QR solo funciona si consumición no fue entregada
- Realtime actualiza mapas cuando cambia estado
- Drag & drop solo funciona en modo admin

## Patrones Implementados

### Singleton Services
Todos los servicios siguen el patrón:
```typescript
class Service {
  private static instance: Service
  private constructor() {}
  static getInstance(): Service {
    if (!Service.instance) {
      Service.instance = new Service()
    }
    return Service.instance
  }
}
export const service = Service.getInstance()
```

### Custom Hooks con Realtime
```typescript
useEffect(() => {
  if (!uuidEvento) return
  const channel = service.subscribe(uuidEvento, callback)
  return () => {
    channel.unsubscribe()
  }
}, [uuidEvento])
```

### Container/Presenter Pattern
- Páginas = Containers (lógica, hooks)
- Componentes shared = Presenters (UI puro)

### Mobile-First
- Bottom navigation en mobile
- Sidebar en desktop
- Botones fixed bottom en formularios mobile
- pb-safe para notch support

## Integración con Sistema Existente

### Compatible con:
- Multi-tenant (uuid_club isolation via RLS)
- Row Level Security policies
- Realtime subscriptions
- Storage buckets
- Role-based access (admin/rrpp/bartender)
- Zustand auth store
- shadcn/ui components
- Tailwind CSS utilities

### No requiere cambios en:
- auth.service.ts
- auth.store.ts
- Supabase client config
- Políticas RLS existentes
- Triggers de eventos/invitados
- Otros módulos (invitados, ventas, etc.)

## Notas Técnicas

### Coordenadas de Mesas
- Almacenadas como porcentaje (0-100)
- Posicionamiento absoluto con `left: X%, top: Y%`
- Transform: translate(-50%, -50%) para centrar
- Drag & drop actualiza coordenadas en tiempo real

### Validación de Imágenes
- Promesa que carga imagen en memoria
- Verifica width=1080, height=1920
- Rechaza con toast si no cumple

### Estados de Mesa
- **Libre** (verde): Puede reservarse o venderse
- **Reservado** (amarillo): Puede venderse o cancelarse
- **Vendido** (rojo): Solo ver QR, no modificable

### QR Flow
1. RRPP vende mesa → genera QR
2. Cliente llega a barra → muestra QR
3. Bartender escanea → marca consumición entregada
4. No se puede escanear dos veces el mismo QR

### Realtime Updates
- Sectores: admin/rrpp ven cambios en tiempo real
- Mesas: estado se actualiza automáticamente
- Ventas: bartender ve nuevas ventas al instante

## Comandos de Desarrollo

```bash
# Iniciar dev server
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

## Rutas Implementadas

### Admin
- `/dashboard/admin/sectores` - Gestión de sectores
- `/dashboard/admin/mesas` - Gestión de mesas

### RRPP
- `/dashboard/rrpp/mesas` - Reserva y venta de mesas

### Bartender
- `/dashboard/bartender/scanner` - Escáner QR (default)
- `/dashboard/bartender/historial` - Historial de entregas

## Próximos Desarrollos Opcionales

1. **Estadísticas de Mesas** en DashboardPage admin
2. **Comisiones RRPP** en VentasPage (incluir mesas)
3. **Asignación de Seguridad a Sectores** (ya tiene service, falta UI)
4. **Exportar ventas** de mesas a Excel/PDF
5. **Notificaciones push** cuando se vende mesa
6. **WhatsApp integration** para enviar QR al cliente
7. **Reportes** de consumiciones entregadas vs pendientes

## Checklist de Implementación

- [x] Tipos TypeScript agregados a database.ts
- [x] 5 servicios creados (sectores, mesas, ventas-mesas, mesas-rpc, sectores-seguridad)
- [x] 4 hooks creados (useSectores, useMesas, useMesaInteraction, index)
- [x] 3 componentes compartidos (MesaCircle, SectorMapView, MesaDetailDialog, index)
- [x] 2 páginas admin (SectoresPage, MesasAdminPage)
- [x] 2 páginas RRPP (MesasRRPPPage, VenderMesaDialog)
- [x] 2 páginas bartender (BartenderScannerPage, BartenderHistorialPage)
- [x] 1 layout bartender (BartenderLayout)
- [x] Routers actualizados (DashboardRouter, AdminDashboard, RRPPDashboard, BartenderDashboard)
- [x] Navegación actualizada (BottomNavigation, AdminLayout)
- [x] UserRole actualizado (incluye bartender)
- [x] ProtectedRoute actualizado (soporta bartender)
- [x] EmpleadosPage actualizado (badge bartender)
- [ ] Ejecutar migraciones SQL en Supabase
- [ ] Crear storage bucket 'sectores-images'
- [ ] Testing completo del flujo
- [ ] Validar políticas RLS para nuevas tablas

## Archivos Totales Creados/Modificados

**Creados**: 17 archivos nuevos
**Modificados**: 6 archivos existentes

Total: 23 archivos tocados

## Estructura de Carpetas Resultante

```
src/
├── types/
│   └── database.ts (MODIFICADO - tipos mesas agregados)
├── services/
│   ├── sectores.service.ts (NUEVO)
│   ├── mesas.service.ts (NUEVO)
│   ├── ventas-mesas.service.ts (NUEVO)
│   ├── mesas-rpc.service.ts (NUEVO)
│   └── sectores-seguridad.service.ts (NUEVO)
├── features/
│   └── mesas/
│       ├── hooks/
│       │   ├── useSectores.ts (NUEVO)
│       │   ├── useMesas.ts (NUEVO)
│       │   ├── useMesaInteraction.ts (NUEVO)
│       │   └── index.ts (NUEVO)
│       └── components/
│           ├── MesaCircle.tsx (NUEVO)
│           ├── SectorMapView.tsx (NUEVO)
│           ├── MesaDetailDialog.tsx (NUEVO)
│           └── index.ts (NUEVO)
├── components/
│   ├── organisms/
│   │   ├── ProtectedRoute.tsx (MODIFICADO)
│   │   ├── AdminLayout.tsx (MODIFICADO)
│   │   ├── BottomNavigation.tsx (MODIFICADO)
│   │   └── BartenderLayout.tsx (NUEVO)
│   └── pages/
│       ├── DashboardRouter.tsx (MODIFICADO)
│       ├── AdminDashboard.tsx (MODIFICADO)
│       ├── RRPPDashboard.tsx (MODIFICADO)
│       ├── BartenderDashboard.tsx (NUEVO)
│       ├── admin/
│       │   ├── EmpleadosPage.tsx (MODIFICADO)
│       │   ├── SectoresPage.tsx (NUEVO)
│       │   └── MesasAdminPage.tsx (NUEVO)
│       ├── rrpp/
│       │   ├── MesasRRPPPage.tsx (NUEVO)
│       │   └── VenderMesaDialog.tsx (NUEVO)
│       └── bartender/
│           ├── BartenderScannerPage.tsx (NUEVO)
│           └── BartenderHistorialPage.tsx (NUEVO)
```

## Características Implementadas

### Admin
- Crear/editar/eliminar sectores
- Upload de imágenes 1080x1920
- Crear/editar/eliminar mesas
- Posicionar mesas con drag & drop
- Configurar precio, capacidad, comisión, consumición
- Ver mapa visual de sectores
- Asignar seguridad a sectores (service ready, UI pendiente)

### RRPP
- Ver mapa de sectores
- Reservar mesas (libre → reservado)
- Vender mesas (libre/reservado → vendido)
- Cancelar reservas (reservado → libre)
- Generar QR de venta
- Ver QR de mesas vendidas
- Estadísticas en tiempo real

### Bartender
- Escanear QR de ventas
- Validar estado de consumición
- Marcar consumición entregada
- Ver historial de entregas
- Estadísticas personales
- Filtrar por evento

## Estado de Compilación

Código TypeScript compilado sin errores críticos.
Listo para ejecutar `npm run dev`.

## Dependencias Utilizadas

Todas las dependencias ya estaban instaladas:
- react
- react-router-dom
- @supabase/supabase-js
- zustand
- framer-motion
- html5-qrcode
- lucide-react
- sonner
- date-fns
- shadcn/ui components

## Conclusión

Sistema de mesas COMPLETAMENTE implementado en frontend para los 3 roles.
Falta ejecutar migraciones SQL y crear storage bucket.
Código sigue todos los patrones del proyecto existente.
Mobile-first, responsive, con realtime y validaciones.
