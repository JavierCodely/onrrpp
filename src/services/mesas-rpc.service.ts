import { supabase } from '@/lib/supabase'
import type { VentaMesaResult } from '@/types/database'

class MesasRPCService {
  private static instance: MesasRPCService

  private constructor() {}

  static getInstance(): MesasRPCService {
    if (!MesasRPCService.instance) {
      MesasRPCService.instance = new MesasRPCService()
    }
    return MesasRPCService.instance
  }

  async reservarMesa(mesaId: string): Promise<{ data: VentaMesaResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('reservar_mesa', {
        p_uuid_mesa: mesaId,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async venderMesa(
    mesaId: string,
    clienteDni: string,
    clienteNombre: string | null,
    clienteEmail: string | null,
    precioVenta: number | null,
    metodoPago: string = 'efectivo',
    montoEfectivo: number = 0,
    montoTransferencia: number = 0
  ): Promise<{ data: VentaMesaResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('vender_mesa', {
        p_uuid_mesa: mesaId,
        p_cliente_dni: clienteDni,
        p_cliente_nombre: clienteNombre,
        p_cliente_email: clienteEmail,
        p_precio_venta: precioVenta,
        p_metodo_pago: metodoPago,
        p_monto_efectivo: montoEfectivo,
        p_monto_transferencia: montoTransferencia,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async liberarReservaMesa(mesaId: string): Promise<{ data: VentaMesaResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('liberar_reserva_mesa', {
        p_uuid_mesa: mesaId,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async escanearMesaBartender(
    qrCode: string,
    marcarEntregado: boolean = false
  ): Promise<{ data: VentaMesaResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('escanear_mesa_bartender', {
        p_qr_code: qrCode,
        p_marcar_entregado: marcarEntregado,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async escanearMesaSeguridad(
    qrCode: string,
    soloVerificar: boolean = false
  ): Promise<{ data: VentaMesaResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('escanear_mesa_seguridad', {
        p_qr_code: qrCode,
        p_solo_verificar: soloVerificar,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }
}

export const mesasRPCService = MesasRPCService.getInstance()
