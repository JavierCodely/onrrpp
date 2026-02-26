import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Mesa } from '@/types/database'

class MesasService {
  private static instance: MesasService

  private constructor() {}

  static getInstance(): MesasService {
    if (!MesasService.instance) {
      MesasService.instance = new MesasService()
    }
    return MesasService.instance
  }

  async getMesasBySector(uuidSector: string): Promise<{ data: Mesa[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*, rrpp:personal!mesas_id_rrpp_fkey(nombre, apellido)')
        .eq('uuid_sector', uuidSector)
        .order('nombre', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getMesasByEvento(uuidEvento: string): Promise<{ data: Mesa[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*, rrpp:personal!mesas_id_rrpp_fkey(nombre, apellido)')
        .eq('uuid_evento', uuidEvento)
        .order('nombre', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getMesaById(mesaId: string): Promise<{ data: Mesa | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*, rrpp:personal!mesas_id_rrpp_fkey(nombre, apellido)')
        .eq('id', mesaId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async createMesa(params: {
    nombre: string
    max_personas: number
    precio: number
    comision_tipo: 'monto' | 'porcentaje'
    comision_rrpp_monto: number
    comision_rrpp_porcentaje: number
    tiene_consumicion: boolean
    detalle_consumicion: string | null
    monto_consumicion: number
    coordenada_x: number
    coordenada_y: number
    uuid_sector: string
    uuid_evento: string
  }): Promise<{ data: Mesa | null; error: Error | null }> {
    try {
      const user = useAuthStore.getState().user
      if (!user?.club?.id) throw new Error('No se encontró el club del usuario')

      const { data, error } = await supabase
        .from('mesas')
        .insert({
          nombre: params.nombre,
          max_personas: params.max_personas,
          precio: params.precio,
          comision_tipo: params.comision_tipo,
          comision_rrpp_monto: params.comision_rrpp_monto,
          comision_rrpp_porcentaje: params.comision_rrpp_porcentaje,
          tiene_consumicion: params.tiene_consumicion,
          detalle_consumicion: params.detalle_consumicion,
          monto_consumicion: params.monto_consumicion,
          coordenada_x: params.coordenada_x,
          coordenada_y: params.coordenada_y,
          uuid_sector: params.uuid_sector,
          uuid_evento: params.uuid_evento,
          uuid_club: user.club.id,
          estado: 'libre',
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async updateMesa(
    mesaId: string,
    updates: Partial<Pick<Mesa,
      'nombre' | 'max_personas' | 'precio' |
      'comision_tipo' | 'comision_rrpp_monto' | 'comision_rrpp_porcentaje' |
      'tiene_consumicion' | 'detalle_consumicion' | 'monto_consumicion' |
      'coordenada_x' | 'coordenada_y'
    >>
  ): Promise<{ data: Mesa | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .update(updates)
        .eq('id', mesaId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async updatePosicion(
    mesaId: string,
    coordenada_x: number,
    coordenada_y: number
  ): Promise<{ data: Mesa | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .update({ coordenada_x, coordenada_y })
        .eq('id', mesaId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async deleteMesa(mesaId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('mesas')
        .delete()
        .eq('id', mesaId)

      if (error) throw error
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  async getVentaQRByMesa(mesaId: string): Promise<{ qr_code: string | null; cliente_nombre: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('ventas_mesas')
        .select('qr_code, id_rrpp, cliente_nombre')
        .eq('uuid_mesa', mesaId)
        .single()

      if (error) throw error

      if (data?.id_rrpp !== user.id) {
        return { qr_code: null, cliente_nombre: null, error: new Error('No tienes permiso para ver este QR') }
      }

      return { qr_code: data?.qr_code || null, cliente_nombre: data?.cliente_nombre || null, error: null }
    } catch (err) {
      return { qr_code: null, cliente_nombre: null, error: err as Error }
    }
  }

  subscribeToMesas(uuidEvento: string, callback: () => void) {
    const channel = supabase
      .channel(`mesas-${uuidEvento}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mesas',
          filter: `uuid_evento=eq.${uuidEvento}`,
        },
        () => callback()
      )
      .subscribe()

    return channel
  }
}

export const mesasService = MesasService.getInstance()
