import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService, type EventoRRPPStats } from '@/services/eventos.service'
import { lotesService } from '@/services/lotes.service'
import { supabase } from '@/lib/supabase'
import type { Lote } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Calendar, Users, UserCheck } from 'lucide-react'
import { LoteSelectionDialog } from '@/features/invitados/components'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const GREETING_EMOJIS = ['👋', '🎉', '🔥', '✨', '🚀', '💪', '⚡', '🌟', '😎', '🙌', '💥', '🎊']

export function EventosRRPPPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<EventoRRPPStats[]>([])
  const [loading, setLoading] = useState(true)
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false)
  const [selectedEvento, setSelectedEvento] = useState<EventoRRPPStats | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)

  const randomEmoji = useMemo(() => {
    return GREETING_EMOJIS[Math.floor(Math.random() * GREETING_EMOJIS.length)]
  }, [])

  // Mismo filtro que Entradas: solo lotes del grupo del RRPP o sin grupo
  const lotesDisponibles = useMemo(() => {
    if (!user?.personal.grupo) return lotes
    return lotes.filter((lote) => {
      if (lote.grupo === null) return true
      return lote.grupo === user.personal.grupo
    })
  }, [lotes, user?.personal.grupo])

  useEffect(() => {
    if (!user) return

    loadEventos()

    // Subscribir a cambios en invitados (para actualizar mis estadísticas)
    // Escuchamos TODOS los cambios en invitados (no solo los míos) porque cuando
    // seguridad escanea el QR, el id_rrpp sigue siendo mío pero el UPDATE lo hace seguridad
    const invitadosChannel = supabase
      .channel('invitados-rrpp-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitados',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Solo recargar si el cambio afecta a MIS invitados
          const invitado = payload.new || payload.old
          if (invitado && invitado.id_rrpp === user.id) {
            loadEventos()
          }
        }
      )
      .subscribe()

    // Cleanup al desmontar
    return () => {
      invitadosChannel.unsubscribe()
    }
  }, [user])

  const loadEventos = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await eventosService.getEventosRRPPStats(user.id)
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      // Filtrar solo eventos activos
      const eventosActivos = data.filter(e => e.evento_estado)
      setEventos(eventosActivos)
    }
    setLoading(false)
  }

  const handleOpenLotesDialog = async (evento: EventoRRPPStats) => {
    setSelectedEvento(evento)
    setLotesDialogOpen(true)
    setLoadingLotes(true)

    // Usar getLotesActivosByEvento para incluir lotes llenos (se muestran como SOLD OUT)
    const { data, error } = await lotesService.getLotesActivosByEvento(evento.evento_id)
    setLoadingLotes(false)

    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  const handleSelectLote = (lote: Lote) => {
    if (!selectedEvento) return

    // No permitir seleccionar lotes agotados
    const disponibles = lote.cantidad_maxima - lote.cantidad_actual
    if (disponibles <= 0) {
      toast.error('Lote agotado', {
        description: 'Este lote ya alcanzó su capacidad máxima',
      })
      return
    }

    // Navegar a crear invitado con lote preseleccionado usando URL params
    navigate(`/dashboard/rrpp/invitados?eventoId=${selectedEvento.evento_id}&loteId=${lote.id}`)
    setLotesDialogOpen(false)
  }

  const formatFecha = (fecha: string) => {
    try {
      const fechaFormateada = format(new Date(fecha), "EEEE d MMMM", { locale: es })
      return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)
    } catch {
      return fecha
    }
  }

  const formatHora = (fecha: string) => {
    try {
      return format(new Date(fecha), "HH:mm", { locale: es })
    } catch {
      return ''
    }
  }

  const formatFechaCorta = (fecha: string) => {
    try {
      // Formato: SAB. 20 DIC
      return format(new Date(fecha), "EEE. d MMM", { locale: es }).toUpperCase()
    } catch {
      return fecha
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Hola! {user?.personal.nombre} {randomEmoji}</h1>
          {user?.personal.grupo && (
            <Badge
              className={`text-white font-semibold ${
                user.personal.grupo === 'A' ? 'bg-blue-500 hover:bg-blue-600' :
                user.personal.grupo === 'B' ? 'bg-green-500 hover:bg-green-600' :
                user.personal.grupo === 'C' ? 'bg-purple-500 hover:bg-purple-600' :
                user.personal.grupo === 'D' ? 'bg-orange-500 hover:bg-orange-600' :
                'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              Grupo {user.personal.grupo}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Selecciona un evento para crear entradas
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Cargando eventos...
        </div>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay eventos activos disponibles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {eventos.map((evento) => (
            <Card
              key={evento.evento_id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow neon-border-subtle"
              onClick={() => handleOpenLotesDialog(evento)}
            >
              <div className="flex h-24">
                {/* Banner Izquierda */}
                <div className="w-40 flex-shrink-0">
                  {evento.evento_banner_url ? (
                    <img
                      src={evento.evento_banner_url}
                      alt={evento.evento_nombre}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Información Derecha */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  {/* Fecha y Hora */}
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-md bg-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {formatFechaCorta(evento.evento_fecha)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {formatHora(evento.evento_fecha)} hs
                    </span>
                  </div>

                  {/* Título del evento */}
                  <h3 className="font-bold text-sm line-clamp-1">
                    {evento.evento_nombre}
                  </h3>

                  {/* Estadísticas */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">{evento.mis_invitados}</span>
                      <span className="text-[10px] text-muted-foreground">Entradas</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary">{evento.mis_ingresados}</span>
                      <span className="text-[10px] text-muted-foreground">Ingresados</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de selección de lote (mismo que Entradas) */}
      <LoteSelectionDialog
        open={lotesDialogOpen}
        onOpenChange={setLotesDialogOpen}
        lotes={lotesDisponibles}
        loading={loadingLotes}
        onSelectLote={handleSelectLote}
        onClose={() => {
          setSelectedEvento(null)
          setLotes([])
        }}
        title="Seleccionar Lote"
        description="Selecciona un lote para crear la entrada"
        eventoNombre={selectedEvento?.evento_nombre}
        eventoSubtitle={
          selectedEvento
            ? `${formatFecha(selectedEvento.evento_fecha)} - ${formatHora(selectedEvento.evento_fecha)} hs`
            : undefined
        }
        closeButtonLabel="Cerrar"
      />
    </div>
  )
}
