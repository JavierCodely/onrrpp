import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Shield, X } from 'lucide-react'
import { toast } from 'sonner'
import { sectoresService } from '@/services/sectores.service'
import { eventosService } from '@/services/eventos.service'
import { sectoresSeguridadService } from '@/services/sectores-seguridad.service'
import { useSectores } from '@/features/mesas/hooks'
import type { Evento, SectorSeguridadConDetalles } from '@/types/database'

export function SectoresPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<any>(null)
  const [nombre, setNombre] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Security assignment states
  const [seguridadDialogOpen, setSeguridadDialogOpen] = useState(false)
  const [seguridadSectorId, setSeguridadSectorId] = useState<string>('')
  const [seguridadSectorNombre, setSeguridadSectorNombre] = useState<string>('')
  const [asignaciones, setAsignaciones] = useState<Record<string, SectorSeguridadConDetalles[]>>({})
  const [seguridadesDisponibles, setSeguridadesDisponibles] = useState<any[]>([])
  const [selectedSeguridad, setSelectedSeguridad] = useState<string>('')
  const [assigningSeguridad, setAssigningSeguridad] = useState(false)

  const { sectores, loading: loadingSectores, loadSectores } = useSectores(selectedEvento || null)

  useEffect(() => {
    if (user?.club.id) {
      loadEventos()
      loadSeguridadesDisponibles()
    }
  }, [user?.club.id])

  useEffect(() => {
    if (sectores.length > 0) {
      loadAllAsignaciones()
    }
  }, [sectores])

  const loadEventos = async () => {
    const { data } = await eventosService.getEventos()
    setEventos((data || []).filter((e) => e.estado))
  }

  const loadSeguridadesDisponibles = async () => {
    if (!user?.club.id) return
    const { data } = await sectoresSeguridadService.getSeguridadesDisponibles(user.club.id)
    setSeguridadesDisponibles(data || [])
  }

  const loadAllAsignaciones = async () => {
    const result: Record<string, SectorSeguridadConDetalles[]> = {}
    for (const sector of sectores) {
      const { data } = await sectoresSeguridadService.getAsignacionesBySector(sector.id)
      result[sector.id] = data || []
    }
    setAsignaciones(result)
  }

  const loadAsignacionesBySector = async (sectorId: string) => {
    const { data } = await sectoresSeguridadService.getAsignacionesBySector(sectorId)
    setAsignaciones(prev => ({ ...prev, [sectorId]: data || [] }))
  }

  const eventosActivos = eventos

  const handleOpenDialog = (sector?: any) => {
    if (sector) {
      setEditingSector(sector)
      setNombre(sector.nombre)
      setImagePreview(sector.imagen_url)
    } else {
      setEditingSector(null)
      setNombre('')
      setImageFile(null)
      setImagePreview(null)
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSector(null)
    setNombre('')
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Formato inválido', { description: 'Solo se permiten imágenes' })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('Nombre requerido', { description: 'Debes ingresar un nombre para el sector' })
      return
    }

    if (!editingSector && !imageFile) {
      toast.error('Imagen requerida', { description: 'Debes seleccionar una imagen (1080x1920)' })
      return
    }

    if (!selectedEvento) {
      toast.error('Evento requerido', { description: 'Debes seleccionar un evento' })
      return
    }

    setSubmitting(true)

    if (editingSector) {
      const { error } = await sectoresService.updateSector(editingSector.id, nombre, imageFile || undefined)
      if (error) {
        toast.error('Error al actualizar', { description: error.message })
      } else {
        toast.success('Sector actualizado')
        loadSectores()
        handleCloseDialog()
      }
    } else {
      if (!imageFile) {
        toast.error('Imagen requerida')
        setSubmitting(false)
        return
      }

      const { error } = await sectoresService.createSector(nombre, selectedEvento, imageFile)
      if (error) {
        toast.error('Error al crear', { description: error.message })
      } else {
        toast.success('Sector creado')
        loadSectores()
        handleCloseDialog()
      }
    }

    setSubmitting(false)
  }

  const handleDelete = async (sectorId: string) => {
    setDeleting(sectorId)
    const { error } = await sectoresService.deleteSector(sectorId)

    if (error) {
      toast.error('Error al eliminar', { description: error.message })
    } else {
      toast.success('Sector eliminado')
      loadSectores()
    }

    setDeleting(null)
  }

  const handleOpenSeguridadDialog = (sectorId: string, sectorNombre: string) => {
    setSeguridadSectorId(sectorId)
    setSeguridadSectorNombre(sectorNombre)
    setSelectedSeguridad('')
    setSeguridadDialogOpen(true)
  }

  const handleAssignSeguridad = async () => {
    if (!selectedSeguridad || !seguridadSectorId) return
    setAssigningSeguridad(true)

    const { error } = await sectoresSeguridadService.assignSeguridadToSector(seguridadSectorId, selectedSeguridad)

    if (error) {
      toast.error('Error al asignar', { description: error.message })
    } else {
      toast.success('Seguridad asignado al sector')
      await loadAsignacionesBySector(seguridadSectorId)
    }

    setSelectedSeguridad('')
    setAssigningSeguridad(false)
  }

  const handleUnassignSeguridad = async (assignmentId: string, sectorId: string) => {
    const { error } = await sectoresSeguridadService.unassignSeguridadFromSector(assignmentId)

    if (error) {
      toast.error('Error al desasignar', { description: error.message })
    } else {
      toast.success('Seguridad desasignado')
      await loadAsignacionesBySector(sectorId)
    }
  }

  // Filter out already-assigned security for this sector
  const getAvailableSeguridadesForSector = (sectorId: string) => {
    const assigned = asignaciones[sectorId] || []
    const assignedIds = assigned.map(a => a.id_seguridad)
    return seguridadesDisponibles.filter(s => !assignedIds.includes(s.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Sectores</h1>
          <p className="text-muted-foreground">Administra los sectores y mapas de mesas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Evento</CardTitle>
          <CardDescription>Elige un evento para gestionar sus sectores</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEvento} onValueChange={setSelectedEvento}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar evento..." />
            </SelectTrigger>
            <SelectContent>
              {eventosActivos.map((evento) => (
                <SelectItem key={evento.id} value={evento.id}>
                  {evento.nombre} - {new Date(evento.fecha).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEvento && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Sectores del Evento</CardTitle>
                <CardDescription>{sectores.length} sectores registrados</CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Sector
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loadingSectores ? (
              <div className="text-center py-8 text-muted-foreground">Cargando sectores...</div>
            ) : sectores.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No hay sectores registrados</p>
                <Button onClick={() => handleOpenDialog()} variant="outline">
                  Agregar primer sector
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectores.map((sector) => (
                  <Card key={sector.id}>
                    <CardContent className="p-4">
                      <div
                        className="w-full aspect-[9/16] bg-gray-200 rounded-lg mb-3 bg-cover bg-center"
                        style={{ backgroundImage: `url(${sector.imagen_url})` }}
                      />
                      <h3 className="font-semibold text-lg mb-2">{sector.nombre}</h3>

                      {/* Security assignments */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Seguridad
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleOpenSeguridadDialog(sector.id, sector.nombre)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Asignar
                          </Button>
                        </div>
                        {(asignaciones[sector.id] || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin seguridad asignada</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(asignaciones[sector.id] || []).map((a) => (
                              <Badge key={a.id} variant="secondary" className="gap-1 text-xs">
                                {a.seguridad_nombre} {a.seguridad_apellido}
                                <button
                                  onClick={() => handleUnassignSeguridad(a.id, sector.id)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOpenDialog(sector)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleting === sector.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar sector</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará el sector <strong>{sector.nombre}</strong> y todas sus mesas.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(sector.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sector create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSector ? 'Editar Sector' : 'Nuevo Sector'}</DialogTitle>
            <DialogDescription>
              {editingSector
                ? 'Modifica los datos del sector'
                : 'Crea un nuevo sector para el evento (imagen 1080x1920)'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Sector</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Sector VIP, Pista Central..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen del Sector (1080x1920)</Label>
              <Input
                id="imagen"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required={!editingSector}
              />
              <p className="text-xs text-muted-foreground">
                Formato vertical 1080x1920 píxeles (9:16)
              </p>
            </div>

            {imagePreview && (
              <div className="flex justify-center">
                <div
                  className="w-32 aspect-[9/16] bg-gray-200 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${imagePreview})` }}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Guardando...' : editingSector ? 'Actualizar' : 'Crear Sector'}
              </Button>
              <Button type="button" onClick={handleCloseDialog} variant="outline">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security assignment dialog */}
      <Dialog open={seguridadDialogOpen} onOpenChange={setSeguridadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Seguridad</DialogTitle>
            <DialogDescription>
              Sector: {seguridadSectorNombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current assignments */}
            <div>
              <Label className="text-sm font-medium">Asignados</Label>
              {(asignaciones[seguridadSectorId] || []).length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">Sin seguridad asignada</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(asignaciones[seguridadSectorId] || []).map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-1">
                      {a.seguridad_nombre} {a.seguridad_apellido}
                      <button
                        onClick={() => handleUnassignSeguridad(a.id, seguridadSectorId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Add new assignment */}
            <div className="space-y-2">
              <Label>Agregar seguridad</Label>
              <div className="flex gap-2">
                <Select value={selectedSeguridad} onValueChange={setSelectedSeguridad}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh] overflow-y-auto">
                    {getAvailableSeguridadesForSector(seguridadSectorId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre} {s.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignSeguridad}
                  disabled={!selectedSeguridad || assigningSeguridad}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {getAvailableSeguridadesForSector(seguridadSectorId).length === 0 && (
                <p className="text-xs text-muted-foreground">No hay más seguridad disponible</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
