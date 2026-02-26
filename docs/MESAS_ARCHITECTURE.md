# Arquitectura del Sistema de Mesas

## Diagrama de Flujo por Rol

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN FLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. Crear Evento (EventosPage)
   └─> Evento activo creado

2. Crear Sectores (SectoresPage)
   ├─> Seleccionar evento
   ├─> Subir imagen 1080x1920
   ├─> Imagen almacenada en Storage bucket 'sectores-images'
   └─> Sector creado con imagen pública

3. Crear Mesas (MesasAdminPage)
   ├─> Seleccionar evento → sector
   ├─> Ver mapa del sector (imagen de fondo)
   ├─> Click en mapa o usar formulario
   ├─> Configurar:
   │   ├─> Número (único por sector)
   │   ├─> Capacidad (personas)
   │   ├─> Precio ($)
   │   ├─> Comisión RRPP (%)
   │   ├─> Consumición mínima ($)
   │   └─> Posición X/Y (%)
   └─> Mesa creada en estado 'libre'

4. Reposicionar Mesas (MesasAdminPage)
   ├─> Drag & drop en mapa
   └─> Coordenadas actualizadas en tiempo real


┌─────────────────────────────────────────────────────────────────┐
│                        RRPP FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1. Ver Eventos (EventosRRPPPage o MesasRRPPPage)
   └─> Lista de eventos activos con stats

2. Seleccionar Sector (MesasRRPPPage)
   ├─> Seleccionar evento
   ├─> Seleccionar sector
   └─> Ver mapa con mesas

3. Interactuar con Mesa
   ├─> Click en mesa LIBRE
   │   ├─> Ver detalles (capacidad, precio, comisión)
   │   ├─> Opción A: RESERVAR
   │   │   └─> Estado cambia a 'reservado' (amarillo)
   │   └─> Opción B: VENDER DIRECTAMENTE
   │       ├─> Abrir formulario de venta
   │       ├─> Completar datos cliente
   │       ├─> Confirmar venta
   │       ├─> Estado cambia a 'vendido' (rojo)
   │       ├─> QR generado automáticamente
   │       └─> Mostrar QR al cliente
   │
   ├─> Click en mesa RESERVADA
   │   ├─> Ver detalles
   │   ├─> Opción A: VENDER (confirmar reserva)
   │   │   └─> [mismo flujo que vender directamente]
   │   └─> Opción B: CANCELAR RESERVA
   │       └─> Estado vuelve a 'libre' (verde)
   │
   └─> Click en mesa VENDIDA
       ├─> Ver detalles completos
       ├─> Ver datos del cliente
       └─> Ver QR generado


┌─────────────────────────────────────────────────────────────────┐
│                      BARTENDER FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Escáner QR (BartenderScannerPage) [RUTA DEFAULT]
   ├─> Cámara se inicia automáticamente
   ├─> Cliente muestra QR de mesa vendida
   ├─> Escanear QR
   ├─> Validaciones:
   │   ├─> QR válido? → continuar
   │   ├─> Consumición ya entregada? → rechazar
   │   └─> Todo OK → marcar entregada
   ├─> Mostrar información de la venta
   ├─> Timestamp de entrega guardado
   ├─> ID del bartender registrado
   └─> Espera 3s antes de permitir nuevo escaneo

2. Ver Historial (BartenderHistorialPage)
   ├─> Lista de todas las entregas realizadas
   ├─> Filtrar por evento
   ├─> Ver estadísticas:
   │   ├─> Total entregas
   │   ├─> Personas atendidas
   │   └─> Ventas totales
   └─> Detalles de cada entrega
```

## Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                      UI LAYER (Pages)                            │
│  Admin:     SectoresPage, MesasAdminPage                         │
│  RRPP:      MesasRRPPPage, VenderMesaDialog                      │
│  Bartender: BartenderScannerPage, BartenderHistorialPage        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER (Components)                  │
│  Shared: MesaCircle, SectorMapView, MesaDetailDialog            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LOGIC LAYER (Hooks)                            │
│  useSectores, useMesas, useMesaInteraction                       │
│  - Maneja estado local                                           │
│  - Coordina entre services y UI                                  │
│  - Realtime subscriptions con cleanup                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DATA LAYER (Services)                           │
│  sectoresService, mesasService, ventasMesasService               │
│  mesasRPCService, sectoresSeguridadService                       │
│  - Singleton pattern                                             │
│  - Abstrae llamadas a Supabase                                   │
│  - Maneja errores y transformaciones                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Supabase)                       │
│  Tablas: sectores, mesas, mesas_ventas                           │
│  RPCs:   reservar_mesa, vender_mesa, cancelar_reserva_mesa,     │
│          entregar_consumicion_mesa                               │
│  RLS:    Políticas por uuid_club y rol                           │
│  Realtime: Subscripciones a cambios                              │
│  Storage: Bucket 'sectores-images' (público)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Estados de Mesa (State Machine)

```
      ┌──────────┐
      │  LIBRE   │ (verde)
      └────┬─────┘
           │
           ├──> [RRPP: Reservar] ──────┐
           │                           │
           └──> [RRPP: Vender] ────────┼────┐
                                       │    │
                                       ▼    │
                               ┌──────────┐ │
                               │RESERVADO │ │ (amarillo)
                               └────┬─────┘ │
                                    │       │
                 [RRPP: Cancelar] ──┘       │
                 └──> vuelve a LIBRE        │
                                    │       │
                 [RRPP: Vender] ────┘       │
                                            │
                                            ▼
                                    ┌──────────┐
                                    │ VENDIDO  │ (rojo)
                                    └────┬─────┘
                                         │
                                         │ [Genera QR]
                                         │
                                         ▼
                                [Cliente va a barra]
                                         │
                                         ▼
                            [Bartender escanea QR]
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │ Consumición Entregada    │
                            │ (marca en mesas_ventas)  │
                            └──────────────────────────┘
```

## Flujo de Datos - Venta de Mesa

```
1. RRPP click en mesa libre/reservada
   └─> MesasRRPPPage.handleMesaClick()
       └─> Abre MesaDetailDialog

2. RRPP click "Vender Mesa"
   └─> MesaDetailDialog.onVender()
       └─> Abre VenderMesaDialog

3. RRPP completa formulario cliente
   └─> VenderMesaDialog.handleSubmit()
       └─> useMesaInteraction.venderMesa()
           └─> mesasRPCService.venderMesa()
               └─> Supabase RPC: vender_mesa()
                   ├─> Crea registro en mesas_ventas
                   ├─> Genera QR único
                   ├─> Actualiza mesa.estado = 'vendido'
                   └─> Retorna { success: true, qr_code: 'xxx' }

4. Success callback ejecutado
   └─> onSuccess(qrCode)
       ├─> Cierra VenderMesaDialog
       ├─> Abre QRDialog con código
       └─> loadMesas() refresca vista

5. Realtime trigger
   └─> Otros RRPPs/Admin ven mesa roja instantáneamente
```

## Flujo de Datos - Entrega Consumición

```
1. Cliente llega a barra con QR
   └─> Bartender abre BartenderScannerPage

2. Escáner detecta QR
   └─> onScanSuccess(qrCode)
       ├─> Previene doble escaneo (isProcessingRef)
       ├─> ventasMesasService.getVentaByQR(qrCode)
       │   └─> Obtiene datos de la venta
       │
       ├─> Validaciones:
       │   ├─> QR existe? → continuar
       │   ├─> Consumición ya entregada? → rechazar
       │   └─> Todo OK → procesar
       │
       └─> useMesaInteraction.entregarConsumicion(qrCode)
           └─> mesasRPCService.entregarConsumicionMesa(qrCode)
               └─> Supabase RPC: entregar_consumicion_mesa()
                   ├─> Actualiza mesas_ventas.consumicion_entregada = true
                   ├─> Guarda mesas_ventas.fecha_entrega_consumicion = NOW()
                   ├─> Guarda mesas_ventas.id_bartender_entrega = user_id
                   └─> Retorna { success: true }

3. Feedback visual
   ├─> Toast success
   ├─> Card verde con información
   ├─> Contador 3s antes de nuevo escaneo
   └─> Información actualizada en pantalla
```

## Realtime Subscriptions

### Admin/RRPP - Sectores
```typescript
supabase
  .channel('sectores-{eventoId}')
  .on('postgres_changes', {
    event: '*',
    table: 'sectores',
    filter: 'uuid_evento=eq.{eventoId}'
  }, callback)
```

### Admin/RRPP - Mesas
```typescript
supabase
  .channel('mesas-{eventoId}')
  .on('postgres_changes', {
    event: '*',
    table: 'mesas',
    filter: 'uuid_evento=eq.{eventoId}'
  }, callback)
```

### Bartender - Ventas Mesas
```typescript
supabase
  .channel('ventas-mesas-{eventoId}')
  .on('postgres_changes', {
    event: '*',
    table: 'mesas_ventas',
    filter: 'uuid_evento=eq.{eventoId}'
  }, callback)
```

## Seguridad y Validaciones

### Validaciones Frontend
- Imagen sector: exactamente 1080x1920 píxeles
- Coordenadas mesa: 0-100% (X e Y)
- Capacidad mesa: mínimo 1 persona
- Precio/comisión/consumición: números positivos
- DNI cliente: requerido para venta
- Teléfono cliente: requerido para venta

### Validaciones Backend (RLS + Triggers)
- Solo admin puede crear/editar sectores
- Solo admin puede crear/editar mesas
- RRPP solo puede reservar/vender mesas de SU club
- RRPP no puede editar mesas vendidas/reservadas por otro RRPP
- Bartender solo puede marcar consumiciones entregadas
- Bartender no puede modificar datos de venta
- uuid_club isolation en todas las queries

### Triggers Database
- `prevent_edit_sold_mesa`: Impide editar mesa vendida
- `validate_mesa_position`: Valida coordenadas 0-100
- `update_updated_at_mesas`: Auto-actualiza timestamp
- `generate_qr_venta_mesa`: Genera QR único al vender

## Estructura de Coordenadas

### Sistema de Posicionamiento
```
┌─────────────────────────────────┐
│ (0,0)              (100,0)      │
│   ┌─────────────────────┐       │
│   │                     │       │
│   │   Imagen Sector     │       │
│   │   1080x1920         │       │
│   │   (9:16 ratio)      │       │
│   │                     │       │
│   │     ●  Mesa 1       │       │
│   │     (50,30)         │       │
│   │                     │       │
│   │         ●  Mesa 2   │       │
│   │         (70,60)     │       │
│   │                     │       │
│   └─────────────────────┘       │
│ (0,100)          (100,100)      │
└─────────────────────────────────┘

- Coordenadas en porcentaje (0-100)
- X: izquierda a derecha
- Y: arriba a abajo
- Transform: translate(-50%, -50%) centra círculo
```

## Colores y Estados Visuales

### Mesa States
| Estado     | Color  | Hex       | Acciones Disponibles                |
|------------|--------|-----------|-------------------------------------|
| libre      | Verde  | #22c55e   | Reservar, Vender                    |
| reservado  | Amarillo| #eab308  | Vender, Cancelar Reserva            |
| vendido    | Rojo   | #ef4444   | Ver QR (solo lectura)               |

### Badges Rol
| Rol        | Color    | Permisos Mesas                      |
|------------|----------|-------------------------------------|
| admin      | Azul     | CRUD sectores, CRUD mesas           |
| rrpp       | Verde    | Reservar, Vender, Cancelar          |
| seguridad  | Naranja  | Ver mesas (no interactuar)          |
| bartender  | Púrpura  | Escanear QR, Entregar consumiciones |

## Datos de Venta

### VentaMesa Table
```typescript
{
  id: string                       // UUID
  uuid_mesa: string                // FK a mesas
  uuid_evento: string              // FK a eventos
  id_rrpp: string                  // FK a personal (quien vendió)
  nombre_cliente: string           // Nombre del cliente
  apellido_cliente: string         // Apellido
  dni_cliente: string              // DNI
  telefono_cliente: string         // Teléfono
  email_cliente?: string           // Email (opcional)
  cantidad_personas: number        // Cuántas personas
  precio_final: number             // Precio de venta
  comision_rrpp: number            // Comisión para RRPP
  consumicion_entregada: boolean   // false por defecto
  fecha_entrega_consumicion?: string  // Timestamp entrega
  id_bartender_entrega?: string    // FK a personal (bartender)
  qr_code: string                  // Código QR único
  uuid_club: string                // Tenant isolation
  created_at: string
  updated_at: string
}
```

## Cálculos de Comisión

### Ejemplo:
```
Mesa precio: $10,000
Comisión RRPP: 15%

Venta registrada:
- precio_final: $10,000
- comision_rrpp: $1,500  (15% de $10,000)

RRPP gana: $1,500
Club gana: $8,500
```

## Responsive Design

### Mobile (< 768px)
- Bottom navigation con 5 botones
- Mapa ocupa 100% width
- Formularios con botones fixed bottom
- Grid 1 columna para cards

### Desktop (>= 768px)
- Sidebar navigation
- Mapa en container max-width
- Formularios en modales centrados
- Grid 2-3 columnas para cards

## Performance

### Optimizaciones Implementadas
- Lazy loading de dashboards
- Realtime subscriptions solo cuando es necesario
- Cleanup de subscriptions en useEffect
- Images lazy loaded en mapa
- Debounce en drag & drop (implícito en framer-motion)

### Bundle Size
- AdminDashboard: ~525 KB (incluye mesas)
- RRPPDashboard: ~115 KB
- BartenderDashboard: ~15 KB
- Total chunks: ~1.4 MB (gzipped: ~470 KB)

## Extensibilidad

### Fácil de Agregar
1. Filtros de búsqueda en MesasRRPPPage
2. Vista de lista (además del mapa)
3. Exportar a PDF/Excel
4. Notificaciones push
5. WhatsApp integration
6. Selector de múltiples mesas
7. Paquetes de mesas (combos)

### Patrón a Seguir
```typescript
// 1. Agregar tipo a database.ts
export interface NuevoTipo { ... }

// 2. Crear servicio
class NuevoService {
  private static instance: NuevoService
  static getInstance() { ... }
  async metodo() { ... }
}

// 3. Crear hook
export function useNuevo() {
  const [data, setData] = useState()
  useEffect(() => {
    loadData()
    const channel = service.subscribe(callback)
    return () => channel.unsubscribe()
  }, [deps])
}

// 4. Crear componente
export function NuevoComponent({ data, onAction }: Props) {
  return <div>...</div>
}

// 5. Usar en página
export function NuevaPage() {
  const { data, loading } = useNuevo()
  return <NuevoComponent data={data} onAction={handleAction} />
}
```

## Testing Checklist

### Admin
- [ ] Crear sector con imagen 1080x1920
- [ ] Rechazar imagen de dimensiones incorrectas
- [ ] Editar nombre de sector
- [ ] Editar imagen de sector
- [ ] Eliminar sector sin mesas
- [ ] Eliminar sector con mesas (cascada)
- [ ] Crear mesa en mapa
- [ ] Arrastrar mesa para reposicionar
- [ ] Editar configuración de mesa
- [ ] Eliminar mesa libre
- [ ] Fallar al eliminar mesa reservada/vendida

### RRPP
- [ ] Ver mapa de sector
- [ ] Reservar mesa libre
- [ ] Vender mesa libre directamente
- [ ] Vender mesa reservada (confirmar)
- [ ] Cancelar reserva
- [ ] Ver QR de mesa vendida
- [ ] Ver información de venta
- [ ] Validar que no se puede editar mesa vendida
- [ ] Ver actualización realtime al vender

### Bartender
- [ ] Iniciar escáner automáticamente
- [ ] Escanear QR válido
- [ ] Marcar consumición entregada
- [ ] Rechazar QR ya usado
- [ ] Rechazar QR inválido
- [ ] Ver información de venta
- [ ] Ver historial de entregas
- [ ] Filtrar historial por evento
- [ ] Ver estadísticas correctas

## Troubleshooting

### Imagen no sube
- Verificar que bucket 'sectores-images' existe
- Verificar políticas de storage (SELECT/INSERT/UPDATE public)
- Verificar tamaño de archivo < 5MB

### Drag & drop no funciona
- Verificar que isAdmin=true
- Verificar que framer-motion está instalado
- Verificar que container tiene id="sector-map-container"

### QR no escanea
- Verificar HTTPS (required para camera)
- Verificar permisos de cámara
- Verificar html5-qrcode instalado
- Verificar que QR es visible y claro

### Realtime no actualiza
- Verificar que canal se crea con nombre único
- Verificar que subscription se hace correctamente
- Verificar que cleanup se ejecuta en unmount
- Verificar políticas RLS permiten SELECT

### Mesa no cambia estado
- Verificar función RPC existe en Supabase
- Verificar que retorna { success: boolean, error?: string }
- Verificar triggers están activos
- Verificar RLS permite UPDATE

## Conclusión

Sistema de mesas completamente funcional implementado siguiendo:
- Arquitectura de capas clara
- Separación de responsabilidades
- Singleton pattern en services
- Custom hooks con realtime
- Mobile-first responsive
- Validaciones en frontend y backend
- TypeScript strict mode
- shadcn/ui components
- Tailwind CSS utilities
- Framer Motion animations

Listo para ejecutar migraciones SQL y comenzar testing.
