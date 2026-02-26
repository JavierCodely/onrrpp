import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { lotesService } from '@/services/lotes.service'
import { supabase } from '@/lib/supabase'
import type { Lote } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'

export function useLotesRRPP(eventoId: string | null, selectedInvitadoLoteId?: string | null) {
  const { user } = useAuthStore()
  const [lotes, setLotes] = useState<Lote[]>([])

  const loadLotes = async () => {
    if (!eventoId) return

    // Usar getLotesActivosByEvento para incluir lotes llenos (se muestran como SOLD OUT)
    const { data, error } = await lotesService.getLotesActivosByEvento(eventoId)
    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  // Realtime para actualizar lotes cuando admin los activa/desactiva
  useEffect(() => {
    if (!eventoId) return

    const lotesChannel = supabase
      .channel(`lotes-updates-${eventoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lotes',
          filter: `uuid_evento=eq.${eventoId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime UPDATE en lote:', payload)
          loadLotes() // Recargar lotes cuando hay cambios
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción lotes UPDATE:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de lotes-updates')
      lotesChannel.unsubscribe()
    }
  }, [eventoId])

  // Cargar lotes cuando cambia el eventoId
  useEffect(() => {
    if (eventoId) {
      loadLotes()
    } else {
      setLotes([])
    }
  }, [eventoId])

  // Filtrar lotes disponibles para crear/editar (solo lotes del grupo actual o sin grupo)
  const lotesDisponiblesParaCrear = useMemo(() => {
    if (!user || !user.personal.grupo) return lotes

    return lotes.filter((lote) => {
      // Lotes sin grupo (visible para todos)
      if (lote.grupo === null) return true

      // Lotes del grupo actual del usuario
      if (lote.grupo === user.personal.grupo) return true

      // Si estamos editando, incluir el lote actual del invitado (histórico)
      if (selectedInvitadoLoteId && lote.id === selectedInvitadoLoteId) return true

      // Filtrar lotes de otros grupos
      return false
    })
  }, [lotes, user, selectedInvitadoLoteId])

  return {
    lotes,
    lotesDisponiblesParaCrear,
    loadLotes,
  }
}
