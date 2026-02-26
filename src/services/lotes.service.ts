import { supabase } from '../lib/supabase'
import type { Lote, ComisionTipo, GrupoType } from '../types/database'

export interface CreateLoteDTO {
  nombre: string
  cantidad_maxima: number
  precio: number
  es_vip: boolean
  grupo: GrupoType | null
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  uuid_evento: string
}

export interface UpdateLoteDTO {
  nombre?: string
  cantidad_maxima?: number
  precio?: number
  es_vip?: boolean
  grupo?: GrupoType | null
  comision_tipo?: ComisionTipo
  comision_rrpp_monto?: number
  comision_rrpp_porcentaje?: number
  activo?: boolean
}

export const lotesService = {
  async getLotesByEvento(eventoId: string): Promise<{ data: Lote[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('uuid_evento', eventoId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Retorna todos los lotes activos de un evento (incluyendo los llenos)
   * La UI se encarga de mostrarlos como "SOLD OUT" y deshabilitarlos
   */
  async getLotesActivosByEvento(eventoId: string): Promise<{ data: Lote[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('uuid_evento', eventoId)
        .eq('activo', true)
        .order('created_at', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * @deprecated Use getLotesActivosByEvento instead. This filters out full lotes.
   */
  async getLotesDisponiblesByEvento(eventoId: string): Promise<{ data: Lote[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('uuid_evento', eventoId)
        .eq('activo', true)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Filtrar lotes con disponibilidad en el cliente
      const lotesDisponibles = data?.filter(lote => lote.cantidad_actual < lote.cantidad_maxima) || []

      return { data: lotesDisponibles, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async getLoteById(id: string): Promise<{ data: Lote | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async createLote(lote: CreateLoteDTO): Promise<{ data: Lote | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .insert(lote)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateLote(id: string, updates: UpdateLoteDTO): Promise<{ data: Lote | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
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

  async deleteLote(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('lotes')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}
