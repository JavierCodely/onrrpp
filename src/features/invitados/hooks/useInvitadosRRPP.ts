import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { invitadosService } from '@/services/invitados.service'
import { supabase } from '@/lib/supabase'
import type { InvitadoConLote } from '@/services/invitados.service'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'

export function useInvitadosRRPP(eventoId: string | null) {
  const { user } = useAuthStore()
  const [invitados, setInvitados] = useState<InvitadoConLote[]>([])
  const [loading, setLoading] = useState(false)

  const loadInvitados = async () => {
    if (!user || !eventoId) return []

    setLoading(true)
    const { data, error } = await invitadosService.getMyInvitados(user.id, eventoId)
    if (error) {
      toast.error('Error al cargar invitados', {
        description: error.message,
      })
      setLoading(false)
      return []
    } else if (data) {
      setInvitados(data)
      setLoading(false)
      return data
    }
    setLoading(false)
    return []
  }

  // Realtime para actualizar cuando seguridad escanea QR
  useEffect(() => {
    if (!user || !eventoId) return

    const invitadosChannel = supabase
      .channel(`invitados-updates-${eventoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitados',
          filter: `uuid_evento=eq.${eventoId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const invitadoActualizado = payload.new

          // Actualizar el invitado en la lista local
          setInvitados((prevInvitados) =>
            prevInvitados.map((inv) =>
              inv.id === invitadoActualizado.id
                ? { ...inv, ingresado: invitadoActualizado.ingresado, fecha_ingreso: invitadoActualizado.fecha_ingreso }
                : inv
            )
          )

          // Mostrar notificación si el invitado es mío y acaba de ingresar
          if (invitadoActualizado.id_rrpp === user.id && invitadoActualizado.ingresado) {
            toast.success('Invitado ingresó al evento', {
              description: `${invitadoActualizado.nombre} ${invitadoActualizado.apellido} acaba de ingresar`,
            })
          }
        }
      )
      .subscribe()

    return () => {
      invitadosChannel.unsubscribe()
    }
  }, [user, eventoId])

  // Cargar invitados cuando cambia el eventoId
  useEffect(() => {
    if (eventoId) {
      loadInvitados()
    } else {
      setInvitados([])
    }
  }, [eventoId, user])

  return {
    invitados,
    loading,
    loadInvitados,
  }
}
