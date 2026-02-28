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
    precio_usd?: number | null
    precio_reales?: number | null
    comision_tipo: 'monto' | 'porcentaje'
    comision_rrpp_monto: number
    comision_rrpp_porcentaje: number
    comision_ars?: number
    comision_usd?: number
    comision_reales?: number
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
          precio_usd: params.precio_usd ?? null,
          precio_reales: params.precio_reales ?? null,
          comision_tipo: params.comision_tipo,
          comision_rrpp_monto: params.comision_rrpp_monto,
          comision_rrpp_porcentaje: params.comision_rrpp_porcentaje,
          comision_ars: params.comision_ars ?? 0,
          comision_usd: params.comision_usd ?? 0,
          comision_reales: params.comision_reales ?? 0,
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
      'nombre' | 'max_personas' | 'precio' | 'precio_usd' | 'precio_reales' |
      'comision_tipo' | 'comision_rrpp_monto' | 'comision_rrpp_porcentaje' |
      'comision_ars' | 'comision_usd' | 'comision_reales' |
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

      // Si cambió la comisión, actualizar ventas_mesas para que el trigger recalcule comision_calculada (usa mesa comision_ars/usd/reales por moneda)
      const comisionCambio =
        'comision_tipo' in updates ||
        'comision_rrpp_monto' in updates ||
        'comision_rrpp_porcentaje' in updates ||
        'comision_ars' in updates ||
        'comision_usd' in updates ||
        'comision_reales' in updates

      if (comisionCambio && data) {
        const mesa = data

        // Actualizar los campos de comisión en todas las ventas existentes de esta mesa.
        // El trigger validate_venta_mesa recalculará comision_calculada automáticamente
        // usando los nuevos valores de comision_tipo / comision_rrpp_monto / porcentaje.
        await supabase
          .from('ventas_mesas')
          .update({
            comision_tipo: mesa.comision_tipo,
            comision_rrpp_monto: mesa.comision_rrpp_monto,
            comision_rrpp_porcentaje: mesa.comision_rrpp_porcentaje,
          })
          .eq('uuid_mesa', mesaId)
      }

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

  async getVentaQRByMesa(mesaId: string): Promise<{ qr_code: string | null; cliente_nombre: string | null; precio_venta: number | null; moneda: string; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('ventas_mesas')
        .select('qr_code, id_rrpp, cliente_nombre, precio_venta, moneda')
        .eq('uuid_mesa', mesaId)
        .single()

      if (error) throw error

      if (data?.id_rrpp !== user.id) {
        return { qr_code: null, cliente_nombre: null, precio_venta: null, moneda: 'ARS', error: new Error('No tienes permiso para ver este QR') }
      }

      return {
        qr_code: data?.qr_code || null,
        cliente_nombre: data?.cliente_nombre || null,
        precio_venta: data?.precio_venta ?? null,
        moneda: data?.moneda ?? 'ARS',
        error: null,
      }
    } catch (err) {
      return { qr_code: null, cliente_nombre: null, precio_venta: null, moneda: 'ARS', error: err as Error }
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
