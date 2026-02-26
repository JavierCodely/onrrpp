# Ejemplos de UI para Asignación de Seguridad a Lotes

Este documento contiene ejemplos de componentes React para implementar la funcionalidad de asignación de seguridad a lotes.

## 1. Admin: Gestionar Asignaciones por Lote

### `LoteSeguridadManager.tsx`

Componente para que el admin asigne y vea seguridades asignados a un lote específico.

```tsx
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  assignSeguridadToLote,
  removeSeguridadFromLote,
  getLoteAssignments,
  getSeguridadList
} from '@/services/lotes-seguridad.service'
import type { SeguridadLoteAsignado } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck, UserX, Shield } from 'lucide-react'

interface Props {
  uuidLote: string
  loteNombre: string
}

export const LoteSeguridadManager = ({ uuidLote, loteNombre }: Props) => {
  const [assignments, setAssignments] = useState<SeguridadLoteAsignado[]>([])
  const [seguridadList, setSeguridadList] = useState<
    Array<{ id: string; nombre: string; apellido: string; activo: boolean }>
  >([])
  const [selectedSeguridad, setSelectedSeguridad] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [uuidLote])

  const loadData = async () => {
    const [assignmentsData, seguridadData] = await Promise.all([
      getLoteAssignments(uuidLote),
      getSeguridadList()
    ])
    setAssignments(assignmentsData)
    setSeguridadList(seguridadData.filter((s) => s.activo))
  }

  const handleAssign = async () => {
    if (!selectedSeguridad) {
      toast.error('Selecciona un seguridad')
      return
    }

    setLoading(true)
    const { data, error } = await assignSeguridadToLote(
      uuidLote,
      selectedSeguridad
    )
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Seguridad asignado exitosamente')
    setSelectedSeguridad('')
    setDialogOpen(false)
    loadData()
  }

  const handleRemove = async (assignmentId: string, seguridadNombre: string) => {
    if (
      !confirm(
        `¿Eliminar asignación de ${seguridadNombre} a ${loteNombre}?`
      )
    ) {
      return
    }

    const { success, error } = await removeSeguridadFromLote(assignmentId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Asignación eliminada')
    loadData()
  }

  // Filter out already assigned security
  const availableSeguridad = seguridadList.filter(
    (seg) => !assignments.some((a) => a.id_seguridad === seg.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Seguridad Asignado</h3>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserCheck className="mr-2 h-4 w-4" />
              Asignar Seguridad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Seguridad a {loteNombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                value={selectedSeguridad}
                onValueChange={setSelectedSeguridad}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un seguridad" />
                </SelectTrigger>
                <SelectContent className="max-h-[40vh] overflow-y-auto">
                  {availableSeguridad.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay seguridad disponible para asignar
                    </div>
                  ) : (
                    availableSeguridad.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.apellido}, {seg.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAssign}
                disabled={loading || !selectedSeguridad}
                className="w-full"
              >
                {loading ? 'Asignando...' : 'Confirmar Asignación'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No hay seguridad asignado a este lote
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cualquier seguridad del club podrá escanear estos invitados
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">
                    {assignment.seguridad_apellido},{' '}
                    {assignment.seguridad_nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Asignado el{' '}
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRemove(
                    assignment.id,
                    `${assignment.seguridad_nombre} ${assignment.seguridad_apellido}`
                  )
                }
              >
                <UserX className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 2. Admin: Vista de Asignaciones por Evento

### `EventoSeguridadAssignments.tsx`

Tabla que muestra todas las asignaciones de seguridad para un evento completo.

```tsx
import { useState, useEffect } from 'react'
import { getEventoAssignments } from '@/services/lotes-seguridad.service'
import type { SeguridadLoteAsignado } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

interface Props {
  uuidEvento: string
}

export const EventoSeguridadAssignments = ({ uuidEvento }: Props) => {
  const [assignments, setAssignments] = useState<SeguridadLoteAsignado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [uuidEvento])

  const loadAssignments = async () => {
    setLoading(true)
    const data = await getEventoAssignments(uuidEvento)
    setAssignments(data)
    setLoading(false)
  }

  // Group by lote
  const groupedByLote = assignments.reduce(
    (acc, assignment) => {
      const loteId = assignment.uuid_lote
      if (!acc[loteId]) {
        acc[loteId] = {
          lote_nombre: assignment.lote_nombre,
          lote_es_vip: assignment.lote_es_vip,
          seguridades: []
        }
      }
      acc[loteId].seguridades.push(assignment)
      return acc
    },
    {} as Record<
      string,
      {
        lote_nombre: string
        lote_es_vip: boolean
        seguridades: SeguridadLoteAsignado[]
      }
    >
  )

  if (loading) {
    return <div className="p-4 text-center">Cargando asignaciones...</div>
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay asignaciones de seguridad para este evento
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">
          Asignaciones de Seguridad por Lote
        </h3>
      </div>

      <div className="space-y-3">
        {Object.entries(groupedByLote).map(([loteId, { lote_nombre, lote_es_vip, seguridades }]) => (
          <div key={loteId} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{lote_nombre}</h4>
                {lote_es_vip && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    VIP
                  </Badge>
                )}
              </div>
              <Badge variant="outline">
                {seguridades.length}{' '}
                {seguridades.length === 1 ? 'seguridad' : 'seguridades'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {seguridades.map((assignment) => (
                <Badge key={assignment.id} variant="secondary">
                  <Shield className="mr-1 h-3 w-3" />
                  {assignment.seguridad_apellido}, {assignment.seguridad_nombre}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 3. Seguridad: Ver Mis Lotes Asignados

### `MyAssignedLotes.tsx`

Componente para que el seguridad vea los lotes a los que está asignado.

```tsx
import { useState, useEffect } from 'react'
import { getMyAssignedLotes } from '@/services/lotes-seguridad.service'
import type { MyAssignedLote } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Calendar, Users } from 'lucide-react'

export const MyAssignedLotes = () => {
  const [lotes, setLotes] = useState<MyAssignedLote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLotes()
  }, [])

  const loadLotes = async () => {
    setLoading(true)
    const data = await getMyAssignedLotes()
    setLotes(data)
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4 text-center">Cargando lotes asignados...</div>
  }

  if (lotes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No tienes lotes asignados
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contacta al administrador para que te asigne lotes
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold">Mis Lotes Asignados</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {lotes.map((lote) => {
          const porcentajeLleno =
            (lote.cantidad_actual / lote.cantidad_maxima) * 100

          return (
            <Card key={lote.uuid_lote}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{lote.lote_nombre}</CardTitle>
                  {lote.lote_es_vip && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      VIP
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{lote.evento_nombre}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>
                    {lote.cantidad_actual} / {lote.cantidad_maxima} invitados
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${
                        porcentajeLleno >= 80
                          ? 'bg-red-500'
                          : porcentajeLleno >= 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${porcentajeLleno}%` }}
                    />
                  </div>
                  {porcentajeLleno >= 80 && (
                    <p className="text-xs text-muted-foreground">
                      {porcentajeLleno === 100
                        ? 'SOLD OUT'
                        : 'Últimas disponibles'}
                    </p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Fecha evento:{' '}
                  {new Date(lote.evento_fecha).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

## 4. Seguridad: Scanner con Validación de Lote

### `EnhancedScanner.tsx`

Scanner actualizado que valida asignación de lote antes de permitir escaneo.

```tsx
import { useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import {
  checkSeguridadCanScan,
  marcarIngreso,
  rechazarInvitado
} from '@/services/lotes-seguridad.service'
import type { Invitado } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Shield, ShieldAlert, CheckCircle, XCircle } from 'lucide-react'

export const EnhancedScanner = () => {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)

  const startScanner = async () => {
    // Scanner initialization code...
    setScanning(true)
  }

  const stopScanner = async () => {
    // Scanner cleanup code...
    setScanning(false)
  }

  const handleScan = async (qrCode: string) => {
    // Prevent duplicate scans
    if (isProcessingRef.current || qrCode === lastResult) {
      return
    }

    isProcessingRef.current = true
    setLastResult(qrCode)

    try {
      // Step 1: Check if can scan
      const checkResult = await checkSeguridadCanScan(qrCode)

      if (!checkResult.success) {
        // Show error with lote name
        toast.error(checkResult.error || 'No autorizado', {
          icon: <ShieldAlert className="h-5 w-5" />
        })

        // If error mentions lote name, show specific message
        if (checkResult.error?.includes('pertenece al')) {
          // Show dialog or alert with lote info
          showLoteError(checkResult.lote_nombre || 'otro lote')
        }

        // Reset after 3 seconds
        setTimeout(() => {
          isProcessingRef.current = false
          setLastResult(null)
        }, 3000)
        return
      }

      // Step 2: Mark ingreso
      const ingresoResult = await marcarIngreso(qrCode)

      if (!ingresoResult.success) {
        if (ingresoResult.already_ingresado) {
          toast.warning('Este invitado ya ha ingresado')
        } else if (ingresoResult.error?.includes('rechazado')) {
          toast.error('Invitado rechazado - no puede ingresar', {
            icon: <XCircle className="h-5 w-5" />
          })
        } else {
          toast.error(ingresoResult.error || 'Error al marcar ingreso')
        }

        setTimeout(() => {
          isProcessingRef.current = false
          setLastResult(null)
        }, 3000)
        return
      }

      // Success
      toast.success('Ingreso registrado exitosamente', {
        icon: <CheckCircle className="h-5 w-5" />,
        description: ingresoResult.lote_nombre
          ? `Lote: ${ingresoResult.lote_nombre}`
          : undefined
      })

      // Reset after 2 seconds
      setTimeout(() => {
        isProcessingRef.current = false
        setLastResult(null)
      }, 2000)
    } catch (error) {
      console.error('Error processing scan:', error)
      toast.error('Error al procesar escaneo')

      setTimeout(() => {
        isProcessingRef.current = false
        setLastResult(null)
      }, 3000)
    }
  }

  const showLoteError = (loteNombre: string) => {
    // Show custom dialog/alert
    alert(
      `⚠️ No Autorizado\n\nEste invitado pertenece al lote "${loteNombre}".\n\nSolo el seguridad asignado a ese lote puede escanear este código.`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Scanner QR</h2>
        <Shield className="h-6 w-6 text-blue-600" />
      </div>

      <div id="qr-reader" className="rounded-lg overflow-hidden" />

      <Button
        onClick={scanning ? stopScanner : startScanner}
        className="w-full"
      >
        {scanning ? 'Detener Scanner' : 'Iniciar Scanner'}
      </Button>
    </div>
  )
}
```

## 5. Integración en Páginas Existentes

### Admin Event Page - Añadir Tab de Seguridad

```tsx
import { LoteSeguridadManager } from '@/components/organisms/LoteSeguridadManager'
import { EventoSeguridadAssignments } from '@/components/organisms/EventoSeguridadAssignments'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Inside EventosAdminPage
<Tabs defaultValue="lotes">
  <TabsList>
    <TabsTrigger value="lotes">Lotes</TabsTrigger>
    <TabsTrigger value="seguridad">Asignación Seguridad</TabsTrigger>
  </TabsList>

  <TabsContent value="lotes">
    {/* Existing lotes management */}
  </TabsContent>

  <TabsContent value="seguridad">
    <EventoSeguridadAssignments uuidEvento={eventoId} />
  </TabsContent>
</Tabs>
```

### Lote Detail Modal - Añadir Gestión de Seguridad

```tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{lote.nombre}</DialogTitle>
    </DialogHeader>

    <div className="space-y-6">
      {/* Existing lote info */}
      <div>...</div>

      {/* NEW: Security assignments */}
      <LoteSeguridadManager
        uuidLote={lote.id}
        loteNombre={lote.nombre}
      />
    </div>
  </DialogContent>
</Dialog>
```

### Seguridad Scanner Page - Añadir Vista de Lotes

```tsx
import { MyAssignedLotes } from '@/components/organisms/MyAssignedLotes'
import { EnhancedScanner } from '@/components/organisms/EnhancedScanner'

export const ScannerPage = () => {
  return (
    <div className="space-y-6 p-4">
      {/* Show assigned lotes */}
      <MyAssignedLotes />

      {/* Scanner */}
      <EnhancedScanner />
    </div>
  )
}
```

## Notas de Implementación

1. **Toast Messages**: Usar `sonner` para notificaciones
2. **Iconos**: Usar `lucide-react` (Shield, ShieldAlert, etc.)
3. **UI Components**: Usar shadcn/ui components
4. **Mobile First**: Todos los componentes deben ser responsive
5. **Error Handling**: Mostrar mensajes claros cuando seguridad no está asignado
6. **Loading States**: Siempre mostrar estados de carga
7. **Confirmaciones**: Pedir confirmación antes de eliminar asignaciones

## Testing Checklist

- [ ] Admin puede asignar seguridad a lote
- [ ] Admin puede eliminar asignación
- [ ] Admin ve todas las asignaciones por evento
- [ ] Seguridad ve solo sus lotes asignados
- [ ] Scanner valida asignación antes de escanear
- [ ] Mensaje de error muestra nombre del lote correcto
- [ ] Invitados sin lote se pueden escanear (backward compatibility)
- [ ] No se puede asignar usuario no-seguridad
- [ ] No se puede asignar seguridad de otro club
