import { useState } from 'react'
import { mesasRPCService } from '@/services/mesas-rpc.service'
import { toast } from 'sonner'

export function useMesaInteraction() {
  const [loading, setLoading] = useState(false)

  const reservarMesa = async (mesaId: string, onSuccess?: () => void) => {
    setLoading(true)
    const { data, error } = await mesasRPCService.reservarMesa(mesaId)

    if (error || !data?.success) {
      toast.error('Error al reservar mesa', {
        description: error?.message || data?.error || 'Error desconocido',
      })
    } else {
      toast.success('Mesa reservada')
      onSuccess?.()
    }

    setLoading(false)
    return { data, error }
  }

  const venderMesa = async (
    mesaId: string,
    clienteDni: string,
    clienteNombre: string | null,
    clienteEmail: string | null,
    precioVenta: number | null,
    onSuccess?: (qrCode: string) => void,
    metodoPago: string = 'efectivo',
    montoEfectivo: number = 0,
    montoTransferencia: number = 0
  ) => {
    setLoading(true)
    const { data, error } = await mesasRPCService.venderMesa(
      mesaId,
      clienteDni,
      clienteNombre,
      clienteEmail,
      precioVenta,
      metodoPago,
      montoEfectivo,
      montoTransferencia
    )

    if (error || !data?.success) {
      toast.error('Error al vender mesa', {
        description: error?.message || data?.error || 'Error desconocido',
      })
    } else {
      toast.success('Mesa vendida')
      if (data.qr_code) {
        onSuccess?.(data.qr_code)
      }
    }

    setLoading(false)
    return { data, error }
  }

  const liberarReserva = async (mesaId: string, onSuccess?: () => void) => {
    setLoading(true)
    const { data, error } = await mesasRPCService.liberarReservaMesa(mesaId)

    if (error || !data?.success) {
      toast.error('Error al liberar reserva', {
        description: error?.message || data?.error || 'Error desconocido',
      })
    } else {
      toast.success('Reserva liberada')
      onSuccess?.()
    }

    setLoading(false)
    return { data, error }
  }

  return {
    loading,
    reservarMesa,
    venderMesa,
    liberarReserva,
  }
}
