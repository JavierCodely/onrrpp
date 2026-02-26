import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService } from '@/services/eventos.service'
import { supabase } from '@/lib/supabase'
import type { Evento } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'

export function useEventosRRPP() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar eventos con stats del RRPP
  const loadEventos = async () => {
    if (!user) return

    // Obtener todos los eventos activos del club
    const { data: todosEventos, error: errorEventos } = await eventosService.getEventos()

    if (errorEventos) {
      toast.error('Error al cargar eventos', {
        description: errorEventos.message,
      })
      setLoading(false)
      return
    }

    // Obtener las estadísticas del RRPP
    const { data: statsRRPP, error: errorStats } = await eventosService.getEventosRRPPStats(user.id)

    if (!errorStats && todosEventos) {
      // Crear un mapa de stats por evento_id
      const statsMap = new Map(
        (statsRRPP || []).map(stat => [stat.evento_id, stat])
      )

      // Mapear todos los eventos con sus stats (o 0 si no tiene invitados)
      const eventosMapeados: Evento[] = todosEventos.map(evento => {
        const stat = statsMap.get(evento.id)
        return {
          ...evento,
          total_invitados: stat?.mis_invitados || 0,
          total_ingresados: stat?.mis_ingresados || 0,
        }
      })

      // Filtrar solo eventos activos
      const eventosActivos = eventosMapeados.filter(e => e.estado)
      setEventos(eventosActivos)
    }

    setLoading(false)
  }

  // Realtime para actualizar totales en las cards de eventos
  useEffect(() => {
    if (!user) return

    // Suscribirse a cambios en la tabla invitados para actualizar contadores
    const totalsChannel = supabase
      .channel('invitados-totals-rrpp')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'invitados',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime cambio en invitados para totales:', payload.eventType)

          // Solo actualizar si el cambio afecta a mis invitados
          const invitadoAfectado = payload.new || payload.old
          if (invitadoAfectado && invitadoAfectado.id_rrpp === user.id) {
            const eventoId = invitadoAfectado.uuid_evento

            // Recargar estadísticas del RRPP para este evento específico
            const { data: statsRRPP, error } = await eventosService.getEventosRRPPStats(user.id)

            if (!error && statsRRPP) {
              // Actualizar solo el evento afectado
              setEventos((prevEventos) =>
                prevEventos.map((evento) => {
                  if (evento.id === eventoId) {
                    const stat = statsRRPP.find(s => s.evento_id === eventoId)
                    return {
                      ...evento,
                      total_invitados: stat?.mis_invitados || 0,
                      total_ingresados: stat?.mis_ingresados || 0,
                    }
                  }
                  return evento
                })
              )
              console.log('📡 Contadores actualizados para evento:', eventoId)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción totales RRPP:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de totales RRPP')
      totalsChannel.unsubscribe()
    }
  }, [user])

  // Cargar eventos al montar
  useEffect(() => {
    if (user) {
      loadEventos()
    }
  }, [user])

  return {
    eventos,
    loading,
    loadEventos,
  }
}
