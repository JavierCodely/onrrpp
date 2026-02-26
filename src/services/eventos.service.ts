import { supabase } from '../lib/supabase'
import type { Evento } from '../types/database'

export interface CreateEventoDTO {
  nombre: string
  fecha: string
  banner_url?: string | null
}

export interface UpdateEventoDTO {
  nombre?: string
  fecha?: string
  banner_url?: string | null
  estado?: boolean
}

export interface EventoRRPPStats {
  evento_id: string
  evento_nombre: string
  evento_fecha: string
  evento_banner_url: string | null
  evento_estado: boolean
  evento_uuid_club: string
  id_rrpp: string
  mis_invitados: number
  mis_ingresados: number
}

export const eventosService = {
  async getEventos(): Promise<{ data: Evento[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async getEventosRRPPStats(rrppId: string): Promise<{ data: EventoRRPPStats[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('eventos_rrpp_stats')
        .select('*')
        .eq('id_rrpp', rrppId)
        .order('evento_fecha', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async getEventoById(id: string): Promise<{ data: Evento | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async createEvento(evento: CreateEventoDTO, userId: string): Promise<{ data: Evento | null; error: Error | null }> {
    try {
      // Obtener el club del usuario actual
      const { data: personal, error: personalError } = await supabase
        .from('personal')
        .select('uuid_club')
        .eq('id', userId)
        .single()

      if (personalError) throw personalError
      if (!personal) throw new Error('Personal no encontrado')

      const { data, error } = await supabase
        .from('eventos')
        .insert({
          nombre: evento.nombre,
          fecha: evento.fecha,
          banner_url: evento.banner_url || null,
          uuid_club: personal.uuid_club,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateEvento(id: string, updates: UpdateEventoDTO): Promise<{ data: Evento | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async deleteEvento(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  async toggleEstado(id: string, estado: boolean): Promise<{ data: Evento | null; error: Error | null }> {
    return this.updateEvento(id, { estado })
  },
}
