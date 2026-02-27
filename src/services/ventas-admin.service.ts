import { supabase } from '../lib/supabase'

export interface VentaRRPPResumen {
  id_rrpp: string
  nombre_rrpp: string
  apellido_rrpp: string
  lotes: {
    id_lote: string
    nombre_lote: string
    cantidad_vendida: number
    precio_lote: number
  }[]
  mesas: VentaMesaDetalle[]
  total_transferencia: number
  total_efectivo: number
  total_a_acreditar: number
  total_comisiones: number
  todas_entradas_acreditadas: boolean
  todas_comisiones_acreditadas: boolean
  ventas: VentaDetalle[]
}

export interface VentaDetalle {
  id: string
  uuid_invitado: string
  uuid_lote: string
  metodo_pago: string
  monto_total: number
  monto_efectivo: number
  monto_transferencia: number
  entradas_acreditadas: boolean
  comision_acreditada: boolean
  observaciones: string | null
  created_at: string
}

export interface VentaMesaDetalle {
  id: string
  uuid_mesa: string
  mesa_nombre: string | null
  cliente_nombre: string | null
  precio_venta: number
  monto_efectivo: number
  monto_transferencia: number
  comision_calculada: number
  created_at: string
}

/**
 * Obtiene el resumen de ventas por RRPP para un evento específico
 * Incluye tanto ventas de lotes/entradas como ventas de mesas
 */
export async function getVentasResumenByEvento(eventoId: string) {
  try {
    // Obtener ventas de lotes/entradas
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select(`
        id,
        uuid_invitado,
        uuid_lote,
        id_rrpp,
        metodo_pago,
        monto_total,
        monto_efectivo,
        monto_transferencia,
        entradas_acreditadas,
        comision_acreditada,
        observaciones,
        created_at,
        lotes:uuid_lote (
          id,
          nombre,
          precio,
          comision_tipo,
          comision_rrpp_monto,
          comision_rrpp_porcentaje
        ),
        personal:id_rrpp (
          id,
          nombre,
          apellido
        )
      `)
      .eq('uuid_evento', eventoId)
      .order('created_at', { ascending: false })

    if (ventasError) throw ventasError

    // Obtener ventas de mesas
    const { data: ventasMesas, error: ventasMesasError } = await supabase
      .from('ventas_mesas')
      .select(`
        id,
        uuid_mesa,
        id_rrpp,
        cliente_nombre,
        precio_venta,
        monto_efectivo,
        monto_transferencia,
        comision_calculada,
        created_at,
        mesa:uuid_mesa (
          nombre
        ),
        personal:id_rrpp (
          id,
          nombre,
          apellido
        )
      `)
      .eq('uuid_evento', eventoId)
      .order('created_at', { ascending: false })

    if (ventasMesasError) throw ventasMesasError

    // Agrupar ventas por RRPP
    const ventasPorRRPP = new Map<string, VentaRRPPResumen>()

    for (const venta of ventas || []) {
      const rrppId = venta.id_rrpp
      const lote = venta.lotes as any
      const personal = venta.personal as any

      if (!ventasPorRRPP.has(rrppId)) {
        ventasPorRRPP.set(rrppId, {
          id_rrpp: rrppId,
          nombre_rrpp: personal.nombre,
          apellido_rrpp: personal.apellido,
          lotes: [],
          mesas: [],
          total_transferencia: 0,
          total_efectivo: 0,
          total_a_acreditar: 0,
          total_comisiones: 0,
          todas_entradas_acreditadas: true,
          todas_comisiones_acreditadas: true,
          ventas: [],
        })
      }

      const resumen = ventasPorRRPP.get(rrppId)!

      resumen.ventas.push({
        id: venta.id,
        uuid_invitado: venta.uuid_invitado,
        uuid_lote: venta.uuid_lote,
        metodo_pago: venta.metodo_pago,
        monto_total: Number(venta.monto_total),
        monto_efectivo: Number(venta.monto_efectivo),
        monto_transferencia: Number(venta.monto_transferencia),
        entradas_acreditadas: venta.entradas_acreditadas,
        comision_acreditada: venta.comision_acreditada,
        observaciones: venta.observaciones,
        created_at: venta.created_at,
      })

      resumen.total_transferencia += Number(venta.monto_transferencia)
      resumen.total_efectivo += Number(venta.monto_efectivo)
      resumen.total_a_acreditar += Number(venta.monto_total)

      if (lote) {
        const comision = calcularComision(
          lote.comision_tipo,
          lote.comision_rrpp_monto,
          lote.comision_rrpp_porcentaje,
          Number(venta.monto_total)
        )
        resumen.total_comisiones += comision
      }

      if (!venta.entradas_acreditadas) {
        resumen.todas_entradas_acreditadas = false
      }
      if (!venta.comision_acreditada) {
        resumen.todas_comisiones_acreditadas = false
      }

      const loteExistente = resumen.lotes.find((l) => l.id_lote === venta.uuid_lote)
      if (loteExistente) {
        loteExistente.cantidad_vendida++
      } else {
        resumen.lotes.push({
          id_lote: venta.uuid_lote,
          nombre_lote: lote?.nombre || 'Sin lote',
          cantidad_vendida: 1,
          precio_lote: lote?.precio || 0,
        })
      }
    }

    // Incorporar ventas de mesas al resumen por RRPP
    for (const ventaMesa of ventasMesas || []) {
      const rrppId = ventaMesa.id_rrpp
      const personal = ventaMesa.personal as any

      if (!ventasPorRRPP.has(rrppId)) {
        ventasPorRRPP.set(rrppId, {
          id_rrpp: rrppId,
          nombre_rrpp: personal.nombre,
          apellido_rrpp: personal.apellido,
          lotes: [],
          mesas: [],
          total_transferencia: 0,
          total_efectivo: 0,
          total_a_acreditar: 0,
          total_comisiones: 0,
          todas_entradas_acreditadas: true,
          todas_comisiones_acreditadas: true,
          ventas: [],
        })
      }

      const resumen = ventasPorRRPP.get(rrppId)!

      resumen.mesas.push({
        id: ventaMesa.id,
        uuid_mesa: ventaMesa.uuid_mesa,
        mesa_nombre: (ventaMesa.mesa as any)?.nombre ?? null,
        cliente_nombre: ventaMesa.cliente_nombre,
        precio_venta: Number(ventaMesa.precio_venta),
        monto_efectivo: Number(ventaMesa.monto_efectivo || 0),
        monto_transferencia: Number(ventaMesa.monto_transferencia || 0),
        comision_calculada: Number(ventaMesa.comision_calculada),
        created_at: ventaMesa.created_at,
      })

      resumen.total_efectivo += Number(ventaMesa.monto_efectivo || 0)
      resumen.total_transferencia += Number(ventaMesa.monto_transferencia || 0)
      resumen.total_a_acreditar += Number(ventaMesa.precio_venta)
      resumen.total_comisiones += Number(ventaMesa.comision_calculada)
    }

    return {
      data: Array.from(ventasPorRRPP.values()),
      error: null,
    }
  } catch (error: any) {
    console.error('Error getting ventas resumen:', error)
    return { data: null, error }
  }
}

/**
 * Calcula la comisión según el tipo
 */
function calcularComision(
  tipo: 'monto' | 'porcentaje',
  monto: number,
  porcentaje: number,
  precioVenta: number
): number {
  if (tipo === 'monto') {
    return Number(monto)
  } else if (tipo === 'porcentaje') {
    return (Number(porcentaje) / 100) * precioVenta
  }
  return 0
}

/**
 * Actualiza el estado de entradas acreditadas para múltiples ventas
 */
export async function actualizarEntradasAcreditadas(ventaIds: string[], acreditadas: boolean) {
  try {
    const { error } = await supabase
      .from('ventas')
      .update({ entradas_acreditadas: acreditadas })
      .in('id', ventaIds)

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('Error updating entradas acreditadas:', error)
    return { error }
  }
}

/**
 * Actualiza el estado de comisión acreditada para múltiples ventas
 */
export async function actualizarComisionAcreditada(ventaIds: string[], acreditada: boolean) {
  try {
    const { error } = await supabase
      .from('ventas')
      .update({ comision_acreditada: acreditada })
      .in('id', ventaIds)

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('Error updating comision acreditada:', error)
    return { error }
  }
}

/**
 * Actualiza ambos campos de acreditación para un RRPP en un evento
 */
export async function actualizarAcreditacionRRPP(
  eventoId: string,
  rrppId: string,
  entradasAcreditadas?: boolean,
  comisionAcreditada?: boolean
) {
  try {
    // Obtener IDs de todas las ventas del RRPP en el evento
    const { data: ventas, error: fetchError } = await supabase
      .from('ventas')
      .select('id')
      .eq('uuid_evento', eventoId)
      .eq('id_rrpp', rrppId)

    if (fetchError) throw fetchError

    if (!ventas || ventas.length === 0) {
      return { error: new Error('No se encontraron ventas para este RRPP en el evento') }
    }

    const ventaIds = ventas.map((v) => v.id)

    // Construir objeto de actualización
    const updateData: any = {}
    if (entradasAcreditadas !== undefined) {
      updateData.entradas_acreditadas = entradasAcreditadas
    }
    if (comisionAcreditada !== undefined) {
      updateData.comision_acreditada = comisionAcreditada
    }

    // Actualizar todas las ventas
    const { error: updateError } = await supabase
      .from('ventas')
      .update(updateData)
      .in('id', ventaIds)

    if (updateError) throw updateError

    return { error: null }
  } catch (error: any) {
    console.error('Error updating acreditación RRPP:', error)
    return { error }
  }
}
