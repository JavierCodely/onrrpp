import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService, type EventoRRPPStats } from '@/services/eventos.service'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { useSectores, useMesas, useMesaInteraction } from '@/features/mesas/hooks'
import { SectorMapView, MesaDetailDialog, MesaQRDialog } from '@/features/mesas/components'
import { mesasService } from '@/services/mesas.service'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import VenderMesaDialog from './VenderMesaDialog'
import type { Mesa } from '@/types/database'

export function MesasRRPPPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<EventoRRPPStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null)
  const [mesaDetailOpen, setMesaDetailOpen] = useState(false)
  const [venderDialogOpen, setVenderDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string>('')
  const [qrClienteNombre, setQrClienteNombre] = useState<string | null>(null)

  const { sectores } = useSectores(selectedEvento || null)
  const { mesas, loadMesas } = useMesas(selectedEvento || null, selectedSector || null)
  const { loading: interactionLoading, reservarMesa, liberarReserva } = useMesaInteraction()

  const sector = sectores.find(s => s.id === selectedSector)

  useEffect(() => {
    if (!user) return
    loadEventos()
  }, [user])

  // Auto-select last event
  useEffect(() => {
    if (eventos.length > 0 && !selectedEvento) {
      const activos = eventos.filter(e => e.evento_estado)
      if (activos.length > 0) {
        setSelectedEvento(activos[activos.length - 1].evento_id)
      }
    }
  }, [eventos])

  // Auto-select first sector
  useEffect(() => {
    if (sectores.length > 0 && !selectedSector) {
      setSelectedSector(sectores[0].id)
    }
  }, [sectores])

  const loadEventos = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await eventosService.getEventosRRPPStats(user.id)

    if (error) {
      toast.error('Error al cargar eventos', { description: error.message })
    } else {
      setEventos(data || [])
    }

    setLoading(false)
  }

  const eventosActivos = eventos.filter(e => e.evento_estado)
  const eventoActual = eventosActivos.find(e => e.evento_id === selectedEvento)

  const handleMesaClick = (mesa: Mesa) => {
    setSelectedMesa(mesa)
    setMesaDetailOpen(true)
  }

  const handleReservar = async () => {
    if (!selectedMesa) return
    await reservarMesa(selectedMesa.id, async () => {
      loadMesas()
      const { data } = await mesasService.getMesaById(selectedMesa.id)
      if (data) setSelectedMesa(data)
    })
  }

  const handleVender = () => {
    setMesaDetailOpen(false)
    setVenderDialogOpen(true)
  }

  const handleCancelarReserva = async () => {
    if (!selectedMesa) return
    await liberarReserva(selectedMesa.id, () => {
      loadMesas()
      setMesaDetailOpen(false)
    })
  }

  const handleVentaSuccess = (qr: string, clienteNombre: string | null) => {
    setQrCode(qr)
    setQrClienteNombre(clienteNombre)
    setVenderDialogOpen(false)
    setMesaDetailOpen(false)
    setQrDialogOpen(true)
    loadMesas()
  }

  const handleVerQR = async () => {
    if (!selectedMesa) return
    const { qr_code, cliente_nombre, error } = await mesasService.getVentaQRByMesa(selectedMesa.id)
    if (error) {
      toast.error(error.message)
      return
    }
    if (qr_code) {
      setQrCode(qr_code)
      setQrClienteNombre(cliente_nombre)
      setMesaDetailOpen(false)
      setQrDialogOpen(true)
    } else {
      toast.error('No se encontró el código QR para esta mesa')
    }
  }

  const libres = mesas.filter(m => m.estado === 'libre').length
  const reservadas = mesas.filter(m => m.estado === 'reservado').length
  const vendidas = mesas.filter(m => m.estado === 'vendido').length

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (eventosActivos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No hay eventos activos disponibles.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Selects compactos */}
      <div className="flex gap-2">
        <Select value={selectedEvento} onValueChange={(value) => {
          setSelectedEvento(value)
          setSelectedSector('')
        }}>
          <SelectTrigger className="h-9 text-sm flex-1">
            <SelectValue placeholder="Evento..." />
          </SelectTrigger>
          <SelectContent>
            {eventosActivos.map((evento) => (
              <SelectItem key={evento.evento_id} value={evento.evento_id}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{evento.evento_nombre}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {format(new Date(evento.evento_fecha), 'dd MMM', { locale: es })}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEvento && sectores.length > 0 && (
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="h-9 text-sm w-[140px]">
              <SelectValue placeholder="Sector..." />
            </SelectTrigger>
            <SelectContent>
              {sectores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats compactos en una fila */}
      {selectedSector && mesas.length > 0 && (
        <div className="flex gap-2 text-center text-xs">
          <div className="flex-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md py-1.5">
            <div className="text-lg font-bold text-green-600">{libres}</div>
            <div className="text-green-700 dark:text-green-400">Libres</div>
          </div>
          <div className="flex-1 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md py-1.5">
            <div className="text-lg font-bold text-yellow-600">{reservadas}</div>
            <div className="text-yellow-700 dark:text-yellow-400">Reserv.</div>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md py-1.5">
            <div className="text-lg font-bold text-red-600">{vendidas}</div>
            <div className="text-red-700 dark:text-red-400">Vendidas</div>
          </div>
          <div className="flex-1 bg-muted border rounded-md py-1.5">
            <div className="text-lg font-bold">{mesas.length}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
        </div>
      )}

      {/* Mapa del sector */}
      {selectedSector && sector && (
        <SectorMapView
          imagenUrl={sector.imagen_url}
          mesas={mesas}
          onMesaClick={handleMesaClick}
          isAdmin={false}
          currentUserId={user?.id || null}
        />
      )}

      {/* Dialogs */}
      <MesaDetailDialog
        open={mesaDetailOpen}
        onOpenChange={setMesaDetailOpen}
        mesa={selectedMesa}
        onReservar={selectedMesa?.estado === 'libre' ? handleReservar : undefined}
        onVender={selectedMesa?.id_rrpp === user?.id || selectedMesa?.estado === 'libre' ? handleVender : undefined}
        onLiberarReserva={selectedMesa?.id_rrpp === user?.id ? handleCancelarReserva : undefined}
        onVerQR={selectedMesa?.id_rrpp === user?.id ? handleVerQR : undefined}
        loading={interactionLoading}
      />

      {selectedMesa && (
        <VenderMesaDialog
          open={venderDialogOpen}
          onOpenChange={setVenderDialogOpen}
          mesa={selectedMesa}
          onSuccess={handleVentaSuccess}
        />
      )}

      <MesaQRDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        qrCode={qrCode}
        mesaNombre={selectedMesa?.nombre}
        sectorNombre={sector?.nombre}
        clienteNombre={qrClienteNombre}
        precio={selectedMesa?.precio}
        maxPersonas={selectedMesa?.max_personas}
        detalleConsumicion={selectedMesa?.detalle_consumicion}
        eventoBannerUrl={eventoActual?.evento_banner_url}
        eventoNombre={eventoActual?.evento_nombre}
        eventoFecha={eventoActual?.evento_fecha}
        clubNombre={user?.club?.nombre}
      />
    </div>
  )
}
