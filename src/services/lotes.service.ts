import { supabase } from '../lib/supabase'
import type { Lote, ComisionTipo, GrupoType } from '../types/database'

export interface CreateLoteDTO {
  nombre: string
  cantidad_maxima: number
  precio: number
  precio_usd?: number | null
  precio_reales?: number | null
  es_vip: boolean
  grupo: GrupoType | null
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  comision_ars?: number
  comision_usd?: number
  comision_reales?: number
  uuid_evento: string
}

export interface UpdateLoteDTO {
  nombre?: string
  cantidad_maxima?: number
  precio?: number
  precio_usd?: number | null
  precio_reales?: number | null
  es_vip?: boolean
  grupo?: GrupoType | null
  comision_tipo?: ComisionTipo
  comision_rrpp_monto?: number
  comision_rrpp_porcentaje?: number
  comision_ars?: number
  comision_usd?: number
  comision_reales?: number
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

  /**
   * Actualización parcial (p.ej. solo activo). Usa update directo de Supabase.
   */
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

  /**
   * Actualización completa del lote via RPC (SECURITY DEFINER).
   * Bypasea RLS para garantizar que precio_usd/precio_reales se guarden.
   */
  async updateLoteCompleto(
    id: string,
    updates: Required<Omit<UpdateLoteDTO, 'activo'>> & { activo?: boolean }
  ): Promise<{ error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('update_lote', {
        p_lote_id:             id,
        p_nombre:              updates.nombre,
        p_cantidad_maxima:     updates.cantidad_maxima,
        p_precio:              updates.precio,
        p_precio_usd:          updates.precio_usd ?? null,
        p_precio_reales:       updates.precio_reales ?? null,
        p_es_vip:              updates.es_vip,
        p_grupo:               updates.grupo ?? null,
        p_comision_tipo:       updates.comision_tipo,
        p_comision_rrpp_monto: updates.comision_rrpp_monto,
        p_comision_porcentaje: updates.comision_rrpp_porcentaje,
        p_comision_ars:        updates.comision_ars ?? 0,
        p_comision_usd:        updates.comision_usd ?? 0,
        p_comision_reales:     updates.comision_reales ?? 0,
        p_activo:              updates.activo ?? null,
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string }
      if (!result.success) throw new Error(result.error || 'Error al actualizar lote')

      return { error: null }
    } catch (error) {
      return { error: error as Error }
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
