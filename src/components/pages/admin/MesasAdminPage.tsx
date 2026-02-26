import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Users, DollarSign, Wine, Move } from 'lucide-react'
import { toast } from 'sonner'
import { mesasService } from '@/services/mesas.service'
import { eventosService } from '@/services/eventos.service'
import { useSectores, useMesas } from '@/features/mesas/hooks'
import { SectorMapView } from '@/features/mesas/components'
import type { Evento, Mesa } from '@/types/database'

export function MesasAdminPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMesa, setEditingMesa] = useState<Mesa | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [positionMode, setPositionMode] = useState<string | null>(null) // mesa id being positioned

  const [formData, setFormData] = useState({
    nombre: '',
    max_personas: '1',
    precio: '0',
    comision_tipo: 'porcentaje' as 'monto' | 'porcentaje',
    comision_rrpp_monto: '0',
    comision_rrpp_porcentaje: '0',
    tiene_consumicion: false,
    detalle_consumicion: '',
    monto_consumicion: '0',
  })

  const { sectores } = useSectores(selectedEvento || null)
  const { mesas, loading: loadingMesas, loadMesas } = useMesas(selectedEvento || null, selectedSector || null)

  const sector = sectores.find(s => s.id === selectedSector)

  useEffect(() => {
    if (user?.club.id) {
      loadEventos()
    }
  }, [user?.club.id])

  const loadEventos = async () => {
    const { data } = await eventosService.getEventos()
    setEventos(data || [])
  }

  const handleOpenDialog = (mesa?: Mesa) => {
    if (mesa) {
      setEditingMesa(mesa)
      setFormData({
        nombre: mesa.nombre,
        max_personas: mesa.max_personas.toString(),
        precio: mesa.precio.toString(),
        comision_tipo: mesa.comision_tipo || 'porcentaje',
        comision_rrpp_monto: mesa.comision_rrpp_monto.toString(),
        comision_rrpp_porcentaje: mesa.comision_rrpp_porcentaje.toString(),
        tiene_consumicion: mesa.tiene_consumicion,
        detalle_consumicion: mesa.detalle_consumicion || '',
        monto_consumicion: mesa.monto_consumicion.toString(),
      })
    } else {
      setEditingMesa(null)
      setFormData({
        nombre: '',
        max_personas: '1',
        precio: '0',
        comision_tipo: 'porcentaje',
        comision_rrpp_monto: '0',
        comision_rrpp_porcentaje: '0',
        tiene_consumicion: false,
        detalle_consumicion: '',
        monto_consumicion: '0',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingMesa(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSector || !selectedEvento) {
      toast.error('Debes seleccionar un sector')
      return
    }

    if (!formData.nombre.trim()) {
      toast.error('El nombre de la mesa es obligatorio')
      return
    }

    if (formData.tiene_consumicion && !formData.detalle_consumicion.trim()) {
      toast.error('Debes especificar el detalle de la consumición')
      return
    }

    setSubmitting(true)

    if (editingMesa) {
      const { error } = await mesasService.updateMesa(editingMesa.id, {
        nombre: formData.nombre.trim(),
        max_personas: parseInt(formData.max_personas),
        precio: parseFloat(formData.precio),
        comision_tipo: formData.comision_tipo,
        comision_rrpp_monto: formData.comision_tipo === 'monto' ? parseFloat(formData.comision_rrpp_monto) : 0,
        comision_rrpp_porcentaje: formData.comision_tipo === 'porcentaje' ? parseFloat(formData.comision_rrpp_porcentaje) : 0,
        tiene_consumicion: formData.tiene_consumicion,
        detalle_consumicion: formData.tiene_consumicion ? formData.detalle_consumicion.trim() : null,
        monto_consumicion: formData.tiene_consumicion ? parseFloat(formData.monto_consumicion) : 0,
      })

      if (error) {
        toast.error('Error al actualizar', { description: error.message })
      } else {
        toast.success('Mesa actualizada')
        loadMesas()
        handleCloseDialog()
      }
    } else {
      // Crear en el centro, luego el admin la posiciona
      const { data, error } = await mesasService.createMesa({
        nombre: formData.nombre.trim(),
        max_personas: parseInt(formData.max_personas),
        precio: parseFloat(formData.precio),
        comision_tipo: formData.comision_tipo,
        comision_rrpp_monto: formData.comision_tipo === 'monto' ? parseFloat(formData.comision_rrpp_monto) : 0,
        comision_rrpp_porcentaje: formData.comision_tipo === 'porcentaje' ? parseFloat(formData.comision_rrpp_porcentaje) : 0,
        tiene_consumicion: formData.tiene_consumicion,
        detalle_consumicion: formData.tiene_consumicion ? formData.detalle_consumicion.trim() : null,
        monto_consumicion: formData.tiene_consumicion ? parseFloat(formData.monto_consumicion) : 0,
        coordenada_x: 50,
        coordenada_y: 50,
        uuid_sector: selectedSector,
        uuid_evento: selectedEvento,
      })

      if (error) {
        toast.error('Error al crear', { description: error.message })
      } else {
        toast.success('Mesa creada. Arrastrala en el mapa para posicionarla.')
        if (data) setPositionMode(data.id)
        loadMesas()
        handleCloseDialog()
      }
    }

    setSubmitting(false)
  }

  const handleDelete = async (mesaId: string) => {
    setDeleting(mesaId)
    const { error } = await mesasService.deleteMesa(mesaId)
    if (error) {
      toast.error('Error al eliminar', { description: error.message })
    } else {
      toast.success('Mesa eliminada')
      loadMesas()
    }
    setDeleting(null)
  }

  const handleMesaDragEnd = async (mesaId: string, x: number, y: number) => {
    const { error } = await mesasService.updatePosicion(mesaId, x, y)
    if (error) {
      toast.error('Error al mover mesa', { description: error.message })
    } else {
      if (positionMode === mesaId) setPositionMode(null)
    }
    loadMesas()
  }

  const handleMapClick = async (x: number, y: number) => {
    if (!positionMode) return
    await handleMesaDragEnd(positionMode, x, y)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Mesas</h1>
          <p className="text-muted-foreground">Administra las mesas de cada sector</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEvento} onValueChange={(value) => {
              setSelectedEvento(value)
              setSelectedSector('')
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar evento..." />
              </SelectTrigger>
              <SelectContent>
                {eventos.map((evento) => (
                  <SelectItem key={evento.id} value={evento.id}>
                    {evento.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEvento && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector..." />
                </SelectTrigger>
                <SelectContent>
                  {sectores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedSector && sector && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Mesas de {sector.nombre}</CardTitle>
                <CardDescription>
                  {mesas.length} mesas
                  {positionMode && (
                    <span className="text-yellow-600 ml-2">
                      — Hacé click en el mapa para posicionar la mesa
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Mesa
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loadingMesas ? (
              <div className="text-center py-8 text-muted-foreground">Cargando mesas...</div>
            ) : (
              <>
                <SectorMapView
                  imagenUrl={sector.imagen_url}
                  mesas={mesas}
                  onMesaClick={(mesa) => {
                    if (positionMode) {
                      // Si ya hay una seleccionada, cambia a esta
                      setPositionMode(mesa.id)
                    } else {
                      // Seleccionar para mover
                      setPositionMode(mesa.id)
                      toast.info(`"${mesa.nombre}" seleccionada. Hacé click en el mapa para moverla.`)
                    }
                  }}
                  onMesaLongPress={(mesa) => handleOpenDialog(mesa)}
                  isAdmin={true}
                  onMesaDragEnd={handleMesaDragEnd}
                  onMapClick={handleMapClick}
                  highlightMesaId={positionMode}
                />

                {mesas.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h4 className="font-semibold">Lista de Mesas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mesas.map((mesa) => (
                        <Card key={mesa.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{mesa.nombre}</span>
                                <Badge
                                  className={
                                    mesa.estado === 'libre'
                                      ? 'bg-green-500'
                                      : mesa.estado === 'reservado'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }
                                >
                                  {mesa.estado}
                                </Badge>
                              </div>
                              <div className="text-xs space-y-1 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {mesa.escaneos_seguridad_count}/{mesa.max_personas} personas
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${mesa.precio.toFixed(2)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Comisión: {mesa.comision_tipo === 'porcentaje'
                                    ? `${mesa.comision_rrpp_porcentaje}%`
                                    : `$${mesa.comision_rrpp_monto}`}
                                </div>
                                {mesa.tiene_consumicion && (
                                  <div className="flex items-center gap-1">
                                    <Wine className="h-3 w-3" />
                                    {mesa.detalle_consumicion}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => {
                                  setPositionMode(mesa.id)
                                  toast.info('Hacé click en el mapa para posicionar la mesa')
                                }}
                                variant="ghost"
                                size="sm"
                                title="Reposicionar"
                              >
                                <Move className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleOpenDialog(mesa)}
                                variant="ghost"
                                size="sm"
                                title="Editar"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={deleting === mesa.id || mesa.estado !== 'libre'}
                                    className="text-destructive"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar mesa</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará "{mesa.nombre}". Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDelete(mesa.id)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Crear/Editar Mesa */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMesa ? 'Editar Mesa' : 'Nueva Mesa'}</DialogTitle>
            <DialogDescription>
              {editingMesa ? 'Modifica los datos de la mesa' : 'Crea una nueva mesa en el sector'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la mesa</Label>
              <Input
                id="nombre"
                placeholder="Ej: Mesa 1, VIP-A"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            {/* Max personas (escaneos QR) */}
            <div className="space-y-2">
              <Label htmlFor="max_personas">Cantidad de escaneos QR (personas)</Label>
              <Input
                id="max_personas"
                type="number"
                value={formData.max_personas}
                onChange={(e) => setFormData({ ...formData, max_personas: e.target.value })}
                required
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Cuántas veces puede escanearse el QR en seguridad para ingresar personas
              </p>
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <Label htmlFor="precio">Precio ($)</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                required
                min="0"
              />
            </div>

            {/* Comisión */}
            <div className="space-y-2">
              <Label>Comisión RRPP</Label>
              <Select
                value={formData.comision_tipo}
                onValueChange={(value: 'monto' | 'porcentaje') =>
                  setFormData({ ...formData, comision_tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                  <SelectItem value="monto">Monto fijo ($)</SelectItem>
                </SelectContent>
              </Select>

              {formData.comision_tipo === 'porcentaje' ? (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Porcentaje de comisión"
                  value={formData.comision_rrpp_porcentaje}
                  onChange={(e) => setFormData({ ...formData, comision_rrpp_porcentaje: e.target.value })}
                  min="0"
                  max="100"
                />
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Monto fijo de comisión"
                  value={formData.comision_rrpp_monto}
                  onChange={(e) => setFormData({ ...formData, comision_rrpp_monto: e.target.value })}
                  min="0"
                />
              )}
            </div>

            {/* Consumición */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="tiene_consumicion">Incluye consumición</Label>
                <Switch
                  id="tiene_consumicion"
                  checked={formData.tiene_consumicion}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, tiene_consumicion: checked })
                  }
                />
              </div>

              {formData.tiene_consumicion && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="detalle_consumicion">Detalle de consumición</Label>
                    <Textarea
                      id="detalle_consumicion"
                      placeholder="Ej: 1 botella de vodka Absolut + 2L Coca Cola + hielo y vasos"
                      value={formData.detalle_consumicion}
                      onChange={(e) => setFormData({ ...formData, detalle_consumicion: e.target.value })}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este texto verá el bartender al escanear el QR
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monto_consumicion">Valor de la consumición ($)</Label>
                    <Input
                      id="monto_consumicion"
                      type="number"
                      step="0.01"
                      value={formData.monto_consumicion}
                      onChange={(e) => setFormData({ ...formData, monto_consumicion: e.target.value })}
                      min="0"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Guardando...' : editingMesa ? 'Actualizar' : 'Crear Mesa'}
              </Button>
              <Button type="button" onClick={handleCloseDialog} variant="outline">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
