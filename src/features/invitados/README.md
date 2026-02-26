# Feature: Invitados RRPP

Módulo refactorizado para la gestión de invitados por parte de los usuarios con rol RRPP.

## Estructura del Feature

```
src/features/invitados/
├── components/          # Componentes UI puros y reutilizables
│   ├── EventoCard.tsx                 # Card de evento con banner y stats
│   ├── InvitadosFilters.tsx           # Filtros de búsqueda y estado
│   ├── InvitadosTable.tsx             # Tabla de invitados (desktop)
│   ├── InvitadosMobileList.tsx        # Lista de invitados (mobile)
│   ├── InvitadosList.tsx              # Container que une tabla/lista + filtros
│   ├── InvitadoFormDialog.tsx         # Modal principal de crear/editar invitado
│   ├── DniSearchSection.tsx           # Sección de búsqueda de DNI
│   ├── InvitadoFormFields.tsx         # Campos del formulario de invitado
│   ├── PaymentSection.tsx             # Sección de información de pago
│   ├── QRDialog.tsx                   # Modal de QR del invitado
│   └── index.ts                       # Exports públicos
├── hooks/               # Custom hooks con lógica de negocio
│   ├── useEventosRRPP.ts              # Gestión de eventos + realtime stats
│   ├── useInvitadosRRPP.ts            # Gestión de invitados + realtime updates
│   ├── useLotesRRPP.ts                # Gestión de lotes + filtrado por grupo
│   ├── useDniCheck.ts                 # Lógica de búsqueda de cliente por DNI
│   ├── useInvitadoForm.ts             # Lógica completa del formulario + validaciones
│   ├── useInvitadosFilter.ts          # Filtrado de invitados con debounce
│   └── index.ts                       # Exports públicos
├── types/               # TypeScript interfaces
│   └── index.ts                       # InvitadoFormData, DniCheckState, InvitadoFilters
└── index.ts             # Public API del feature

```

## Principios de Diseño

### 1. Feature-Based Architecture
Todo relacionado con invitados RRPP está en un solo lugar (`src/features/invitados/`). No hay dispersión por carpetas tipo (`components/`, `hooks/`, etc.).

### 2. Separation of Concerns

**UI Layer (components/)**
- Componentes puros que reciben props
- Sin lógica de negocio ni llamadas directas a APIs
- Responsabilidad: Renderizar datos y emitir eventos

**Logic Layer (hooks/)**
- Toda la lógica de negocio está encapsulada en hooks personalizados
- Manejo de estados (loading, error, success)
- Coordinación entre servicios y UI
- Subscripciones realtime

**Data Layer (services/)**
- No forma parte del feature (vive en `src/services/`)
- Solo interactúan los hooks con los servicios

### 3. Composición sobre Herencia

Ejemplo de composición:
```tsx
<InvitadosList>             {/* Container */}
  <InvitadosFilters />      {/* Filtros */}
  <InvitadosTable />        {/* Vista desktop */}
  <InvitadosMobileList />   {/* Vista mobile */}
</InvitadosList>
```

### 4. Single Responsibility

Cada hook tiene UNA responsabilidad:
- `useEventosRRPP`: Solo eventos + stats + realtime
- `useInvitadosRRPP`: Solo invitados + realtime updates
- `useLotesRRPP`: Solo lotes + filtrado por grupo
- `useDniCheck`: Solo búsqueda de DNI
- `useInvitadoForm`: Solo lógica del formulario
- `useInvitadosFilter`: Solo filtrado de listas

## Flujo de Datos

### Carga Inicial
```
InvitadosPage
  └─> useEventosRRPP()
        └─> eventosService.getEventos()
        └─> eventosService.getEventosRRPPStats()
        └─> realtime subscription (invitados changes)
```

### Seleccionar Evento
```
InvitadosPage (selectedEvento cambió)
  └─> useInvitadosRRPP(selectedEvento)
        └─> invitadosService.getMyInvitados()
        └─> realtime subscription (UPDATE invitados)
  └─> useLotesRRPP(selectedEvento)
        └─> lotesService.getLotesDisponiblesByEvento()
        └─> realtime subscription (UPDATE lotes)
```

### Crear Invitado
```
InvitadosPage
  └─> handleOpenDialog()
        └─> InvitadoFormDialog
              ├─> useDniCheck()
              │     └─> clientesService.checkClienteByDNI()
              └─> useInvitadoForm()
                    ├─> invitadosService.createInvitado()
                    ├─> ventasService.createVenta() (si lote tiene precio)
                    └─> onSuccess() → loadInvitados() + loadLotes()
```

## Custom Hooks

### useEventosRRPP
```typescript
const { eventos, loading, loadEventos } = useEventosRRPP()
```
- Carga eventos activos del club
- Obtiene stats personales del RRPP (mis_invitados, mis_ingresados)
- Realtime: actualiza counters cuando hay cambios en invitados

### useInvitadosRRPP
```typescript
const { invitados, loading, loadInvitados } = useInvitadosRRPP(eventoId)
```
- Carga invitados del RRPP para un evento específico
- Realtime: actualiza cuando seguridad escanea QR (ingresado = true)
- Toast notification cuando un invitado ingresa

### useLotesRRPP
```typescript
const { lotes, lotesDisponiblesParaCrear, loadLotes } = useLotesRRPP(eventoId, selectedInvitadoLoteId)
```
- Carga lotes disponibles del evento
- Filtra por grupo del RRPP (solo ve lotes de su grupo o sin grupo)
- Realtime: actualiza cuando admin activa/desactiva lotes

### useDniCheck
```typescript
const { dniInput, checkingDni, clienteEncontrado, dniVerificado, handleSearchDni } = useDniCheck()
```
- Gestiona búsqueda de cliente por DNI
- Estados: cliente encontrado / denegado / nuevo
- Auto-completa formulario si cliente existe

### useInvitadoForm
```typescript
const { formData, handleSubmit, handleLoteChange, selectedLotePrecio, submitting } = useInvitadoForm({ ... })
```
- Lógica completa del formulario de invitado
- Validaciones (sexo, ubicación, lote, imagen VIP, pago)
- Creación/actualización de invitado + venta
- Upload de imagen de perfil

### useInvitadosFilter
```typescript
const { filteredInvitados, searchNombre, filterLote, filterEstado, setSearchNombre } = useInvitadosFilter(invitados)
```
- Filtrado en tiempo real con debounce (300ms)
- Filtros: nombre, lote, estado (todos/ingresados/pendientes)
- `useMemo` para evitar recalcular innecesariamente

## Componentes UI

### EventoCard
Componente puro que renderiza la card de un evento.

**Props**:
- `evento`: Evento con stats
- `isExpanded`: Si está expandido
- `onToggle`: Callback al hacer clic

### InvitadosList
Container que orquesta la lista completa de invitados.

**Props**:
- `invitados`, `filteredInvitados`: Datos
- `lotes`: Para los filtros
- `loading`: Estado de carga
- Filtros: `searchNombre`, `filterEstado`, `filterLote` + callbacks
- Acciones: `onCreateInvitado`, `onEditInvitado`, `onShowQR`

**Composición interna**:
- `<InvitadosFilters />` - Barra de búsqueda y selects
- `<InvitadosTable />` - Vista desktop
- `<InvitadosMobileList />` - Vista mobile

### InvitadoFormDialog
Modal complejo de crear/editar invitado.

**Responsabilidades**:
- Orquesta `useDniCheck` + `useInvitadoForm`
- Renderiza secciones condicionales según modo (crear/editar)
- Mobile-first: fullscreen en mobile, modal en desktop

**Sub-componentes**:
- `<DniSearchSection />` - Solo para creación
- `<InvitadoFormFields />` - Campos principales
- `<PaymentSection />` - Solo si el lote tiene precio

### QRDialog
Modal fullscreen que muestra el QR del invitado.

**Características**:
- Banner del evento de fondo
- QR con logo de la app
- Info del lote y precio
- Mensaje de advertencia (no compartir QR)
- Sponsors en footer

## Página Principal

`InvitadosPage.tsx` ahora es un **orquestador limpio**:
- **128 líneas** (antes 2079)
- Solo coordina hooks y componentes
- Sin lógica de negocio
- Sin JSX complejo

```typescript
export function InvitadosPage() {
  // Estados locales (selección, modales)
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Custom hooks
  const { eventos, loading } = useEventosRRPP()
  const { invitados, loadInvitados } = useInvitadosRRPP(selectedEvento)
  const { lotes, lotesDisponiblesParaCrear, loadLotes } = useLotesRRPP(selectedEvento)
  const { filteredInvitados, searchNombre, setSearchNombre } = useInvitadosFilter(invitados)

  // Handlers simples
  const handleOpenDialog = async () => { ... }

  // Render orquestado
  return (
    <EventoCard />
    <InvitadosList />
    <InvitadoFormDialog />
    <QRDialog />
  )
}
```

## Beneficios de la Refactorización

### Mantenibilidad
- Cada archivo tiene < 200 líneas
- Fácil encontrar y modificar funcionalidad específica
- Tests unitarios por hook/componente

### Reusabilidad
- Hooks pueden usarse en otras páginas
- Componentes UI reutilizables (ej: `EventoCard` en EventosRRPPPage)

### Escalabilidad
- Agregar features no afecta código existente
- Fácil agregar nuevos filtros o validaciones
- Feature flags por módulo

### TypeScript
- Tipos explícitos en interfaces
- Autocomplete en IDE
- Refactors seguros

### Testing (a futuro)
```typescript
// Testear hook aislado
const { result } = renderHook(() => useInvitadosFilter(mockInvitados))
expect(result.current.filteredInvitados).toHaveLength(5)

// Testear componente puro
render(<InvitadosTable invitados={mockData} onEdit={mockFn} />)
expect(screen.getByText('Juan Perez')).toBeInTheDocument()
```

## Migración del Código Original

El archivo original se respaldó como `InvitadosPage.old.tsx` para referencia.

### Cambios Principales
1. **Hooks personalizados**: Toda la lógica de datos movida a hooks
2. **Componentes puros**: UI sin lógica, solo props
3. **Separación realtime**: Cada hook gestiona sus propias subscripciones
4. **Formulario descompuesto**: Modal principal + sub-componentes
5. **Tipos centralizados**: `types/index.ts` con todas las interfaces

### Compatibilidad
- Misma funcionalidad que el original
- Mismas validaciones y flujos
- Mismo comportamiento de realtime
- Mismas rutas y parámetros URL
