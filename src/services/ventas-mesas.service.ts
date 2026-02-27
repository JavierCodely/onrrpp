import { supabase } from '@/lib/supabase'
import type { VentaMesa } from '@/types/database'

class VentasMesasService {
  private static instance: VentasMesasService

  private constructor() {}

  static getInstance(): VentasMesasService {
    if (!VentasMesasService.instance) {
      VentasMesasService.instance = new VentasMesasService()
    }
    return VentasMesasService.instance
  }

  async getVentasByRRPP(idRrpp: string, uuidEvento?: string): Promise<{ data: VentaMesa[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('ventas_mesas')
        .select('*, mesa:uuid_mesa(nombre)')
        .eq('id_rrpp', idRrpp)
        .order('created_at', { ascending: false })

      if (uuidEvento) {
        query = query.eq('uuid_evento', uuidEvento)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped = (data || []).map((vm: any) => ({
        ...vm,
        mesa_nombre: vm.mesa?.nombre ?? null,
        mesa: undefined,
      })) as VentaMesa[]

      return { data: mapped, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getVentasByEvento(uuidEvento: string): Promise<{ data: VentaMesa[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas_mesas')
        .select('*, mesa:uuid_mesa(nombre)')
        .eq('uuid_evento', uuidEvento)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((vm: any) => ({
        ...vm,
        mesa_nombre: vm.mesa?.nombre ?? null,
        mesa: undefined,
      })) as VentaMesa[]

      return { data: mapped, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getVentaByQR(qrCode: string): Promise<{ data: VentaMesa | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas_mesas')
        .select('*')
        .eq('qr_code', qrCode)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getVentasPendientesEntrega(uuidEvento: string): Promise<{ data: VentaMesa[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ventas_mesas')
        .select('*')
        .eq('uuid_evento', uuidEvento)
        .eq('consumicion_entregada', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getHistorialEntregas(idBartender: string, uuidEvento?: string): Promise<{ data: VentaMesa[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('ventas_mesas')
        .select('*')
        .eq('id_bartender_entrega', idBartender)
        .eq('consumicion_entregada', true)
        .order('fecha_entrega_consumicion', { ascending: false })

      if (uuidEvento) {
        query = query.eq('uuid_evento', uuidEvento)
      }

      const { data, error } = await query

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  subscribeToVentasMesas(uuidEvento: string, callback: () => void) {
    const channel = supabase
      .channel(`ventas-mesas-${uuidEvento}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas_mesas',
          filter: `uuid_evento=eq.${uuidEvento}`,
        },
        () => {
          callback()
        }
      )
      .subscribe()

    return channel
  }
}

export const ventasMesasService = VentasMesasService.getInstance()
