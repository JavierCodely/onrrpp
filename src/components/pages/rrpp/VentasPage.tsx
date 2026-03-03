import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { ventasService, type VentasStats } from '@/services/ventas.service'
import { eventosService } from '@/services/eventos.service'
import { supabase } from '@/lib/supabase'
import type { VentaConDetalles, Evento, TipoMoneda } from '@/types/database'
import { MONEDA_SIMBOLO } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { invitadosService } from '@/services/invitados.service'
import { ventasMesasService } from '@/services/ventas-mesas.service'
import type { VentaMesa } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  TrendingUp,
  Users,
  Calendar,
  Tag,
  Crown,
  Ticket,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

export function VentasPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [ventas, setVentas] = useState<VentaConDetalles[]>([])
  const [stats, setStats] = useState<VentasStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [ventasMesas, setVentasMesas] = useState<VentaMesa[]>([])

  useEffect(() => {
    loadEventos()
  }, [])

  useEffect(() => {
    if (selectedEvento && user) {
      loadVentas()
      loadStatsWithCommissions()
      loadVentasMesas()
    }
  }, [selectedEvento, user])

  const loadEventos = async () => {
    const { data, error } = await eventosService.getEventos()
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      const eventosActivos = data.filter(e => e.estado)
      setEventos(eventosActivos)
      if (eventosActivos.length > 0) {
        setSelectedEvento(eventosActivos[0].id)
      }
    }
    setLoading(false)
  }

  const loadVentas = async () => {
    if (!user || !selectedEvento) return

    setLoading(true)
    try {
      const data = await ventasService.getVentasByRRPP(user.id, selectedEvento)
      setVentas(data)
    } catch (error) {
      toast.error('Error al cargar ventas', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
    setLoading(false)
  }

  const loadStatsWithCommissions = async () => {
    if (!user || !selectedEvento) return

    try {
      const data = await ventasService.getVentasStatsWithCommissionsByRRPP(user.id, selectedEvento)
      setStats(data)
    } catch (error) {
      toast.error('Error al cargar estadísticas', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  const loadVentasMesas = async () => {
    if (!user || !selectedEvento) return

    const { data, error } = await ventasMesasService.getVentasByRRPP(user.id, selectedEvento)
    if (error) {
      console.error('Error al cargar ventas de mesas:', error)
    } else {
      setVentasMesas(data || [])
    }
  }

  const handleDeleteVenta = async (venta: VentaConDetalles) => {
    setDeleting(venta.id)
    try {
      const { error } = await invitadosService.deleteInvitado(venta.uuid_invitado)
      if (error) {
        if (error.message.includes('ya ingresó')) {
          toast.error('No se puede eliminar', {
            description: 'Este invitado ya ingresó al evento',
          })
        } else {
          toast.error('Error al eliminar', { description: error.message })
        }
      } else {
        toast.success('Venta eliminada', {
          description: `Se eliminó la venta de ${venta.invitado?.nombre} ${venta.invitado?.apellido}. El QR ya no será válido.`,
        })
        loadVentas()
        loadStatsWithCommissions()
      }
    } catch (err) {
      toast.error('Error al eliminar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
    setDeleting(null)
  }

  // Realtime: Escuchar cambios en ventas
  useEffect(() => {
    if (!user || !selectedEvento) return

    console.log('📡 Configurando Realtime para ventas del RRPP:', user.id)

    const channel = supabase
      .channel(`ventas-rrpp-${user.id}-${selectedEvento}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE y DELETE
          schema: 'public',
          table: 'ventas',
          filter: `id_rrpp=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Cambio en ventas detectado:', payload.eventType, payload)

          // Recargar ventas y estadísticas
          loadVentas()
          loadStatsWithCommissions()
        }
      )
      .subscribe()

    return () => {
      console.log('🔌 Desconectando Realtime de ventas')
      supabase.removeChannel(channel)
    }
  }, [user, selectedEvento])

  const getMetodoPagoBadgeColor = (metodo: string) => {
    switch (metodo) {
      case 'efectivo':
        return 'bg-green-500'
      case 'transferencia':
        return 'bg-blue-500'
      case 'mixto':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return fecha
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-[100vw] overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mis Ventas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Estadísticas y detalle de tus ventas por evento
          </p>
        </div>
      </div>

      {/* Selector de evento */}
      <div className="w-full sm:max-w-md">
        <Select value={selectedEvento} onValueChange={setSelectedEvento}>
          <SelectTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Seleccionar evento" />
          </SelectTrigger>
          <SelectContent>
            {eventos.map((evento) => (
              <SelectItem key={evento.id} value={evento.id}>
                {evento.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvento && stats && (() => {
        const monedaOf = (m?: string | null) => ((m || 'ARS') as TipoMoneda)
        const formatMonto = (m: TipoMoneda, n: number) => (
          m === 'ARS' ? formatCurrency(n) : `${MONEDA_SIMBOLO[m]}${n.toFixed(2)}`
        )

        // Separar ventas de lotes por moneda
        const ventasARS = ventas.filter(v => !v.moneda || v.moneda === 'ARS')
        const ventasUSD = ventas.filter(v => v.moneda === 'USD')
        const ventasBRL = ventas.filter(v => v.moneda === 'BRL')

        // Separar ventas de mesas por moneda
        const mesasARS = ventasMesas.filter(m => !m.moneda || m.moneda === 'ARS')
        const mesasUSD = ventasMesas.filter(m => m.moneda === 'USD')
        const mesasBRL = ventasMesas.filter(m => m.moneda === 'BRL')

        // Totales por moneda - Efectivo
        const efectARS = ventasARS.reduce((s, v) => s + v.monto_efectivo, 0)    + mesasARS.reduce((s, m) => s + (m.monto_efectivo || 0), 0)
        const efectUSD = ventasUSD.reduce((s, v) => s + v.monto_efectivo, 0)    + mesasUSD.reduce((s, m) => s + (m.monto_efectivo || 0), 0)
        const efectBRL = ventasBRL.reduce((s, v) => s + v.monto_efectivo, 0)    + mesasBRL.reduce((s, m) => s + (m.monto_efectivo || 0), 0)

        // Totales por moneda - Transferencia
        const transfARS = ventasARS.reduce((s, v) => s + v.monto_transferencia, 0) + mesasARS.reduce((s, m) => s + (m.monto_transferencia || 0), 0)
        const transfUSD = ventasUSD.reduce((s, v) => s + v.monto_transferencia, 0) + mesasUSD.reduce((s, m) => s + (m.monto_transferencia || 0), 0)
        const transfBRL = ventasBRL.reduce((s, v) => s + v.monto_transferencia, 0) + mesasBRL.reduce((s, m) => s + (m.monto_transferencia || 0), 0)

        // Totales por moneda - Total cobrado
        const totalARS = ventasARS.reduce((s, v) => s + v.monto_total, 0)       + mesasARS.reduce((s, m) => s + m.precio_venta, 0)
        const totalUSD = ventasUSD.reduce((s, v) => s + v.monto_total, 0)       + mesasUSD.reduce((s, m) => s + m.precio_venta, 0)
        const totalBRL = ventasBRL.reduce((s, v) => s + v.monto_total, 0)       + mesasBRL.reduce((s, m) => s + m.precio_venta, 0)

        // Comisiones mesas por moneda
        const comisARS = mesasARS.reduce((s, m) => s + m.comision_calculada, 0)
        const comisUSD = mesasUSD.reduce((s, m) => s + m.comision_calculada, 0)
        const comisBRL = mesasBRL.reduce((s, m) => s + m.comision_calculada, 0)

        // Comisiones lotes: mismo agregado que la tabla "Comisiones por Lote" para que los totales coincidan
        const porLote = ventas.reduce((acc, v) => {
          if (!v.uuid_lote || !v.lote) return acc
          const mon = monedaOf(v.moneda)
          const key = v.uuid_lote
          const lote = v.lote

          if (!acc[key]) {
            acc[key] = {
              uuid_lote: key,
              lote_nombre: lote.nombre,
              lote_es_vip: lote.es_vip,
              lote_precio: lote.precio,
              comision_tipo: lote.comision_tipo,
              comision_rrpp_monto: lote.comision_rrpp_monto,
              comision_rrpp_porcentaje: lote.comision_rrpp_porcentaje,
              comision_ars: lote.comision_ars,
              comision_usd: lote.comision_usd,
              comision_reales: lote.comision_reales,
              cantidad_ventas: 0,
              comision_por_moneda: { ARS: 0, USD: 0, BRL: 0 } as Record<TipoMoneda, number>,
            }
          }

          const row = acc[key]
          row.cantidad_ventas += 1

          let com = 0
          if (row.comision_tipo === 'porcentaje') {
            com = Number(v.monto_total) * (Number(row.comision_rrpp_porcentaje) / 100)
          } else {
            const baseMonto = Number(row.comision_rrpp_monto ?? 0)
            if (mon === 'ARS') {
              com = baseMonto
            } else if (mon === 'USD') {
              const usd = row.comision_usd != null ? Number(row.comision_usd) : NaN
              com = !isNaN(usd) && usd > 0 ? usd : baseMonto
            } else {
              const brl = row.comision_reales != null ? Number(row.comision_reales) : NaN
              com = !isNaN(brl) && brl > 0 ? brl : baseMonto
            }
          }

          row.comision_por_moneda[mon] += com
          return acc
        }, {} as Record<string, { uuid_lote: string; lote_nombre: string; lote_es_vip: boolean; lote_precio: number; comision_tipo: string; comision_rrpp_monto: number; comision_rrpp_porcentaje: number; comision_ars?: number; comision_usd?: number; comision_reales?: number; cantidad_ventas: number; comision_por_moneda: Record<TipoMoneda, number> }>)

        // Totales de comisión por moneda (lotes): suma de lo que muestra la tabla por lote
        const comisLotesARS = Object.values(porLote).reduce((s, row) => s + (row.comision_por_moneda?.ARS ?? 0), 0)
        const comisLotesUSD = Object.values(porLote).reduce((s, row) => s + (row.comision_por_moneda?.USD ?? 0), 0)
        const comisLotesBRL = Object.values(porLote).reduce((s, row) => s + (row.comision_por_moneda?.BRL ?? 0), 0)

        const tieneUSD = totalUSD > 0 || transfUSD > 0 || efectUSD > 0
        const tieneBRL = totalBRL > 0 || transfBRL > 0 || efectBRL > 0

        return (
        <>
          {/* Tarjetas de totales monetarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Efectivo</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ARS</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(efectARS)}</p>
                </div>
                {tieneUSD && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-blue-500">USD</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {efectUSD.toFixed(2)}</p>
                  </div>
                )}
                {tieneBRL && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-green-500">BRL</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {efectBRL.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transferencia</CardTitle>
                <div className="h-4 w-4 rounded-full bg-blue-500" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ARS</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(transfARS)}</p>
                </div>
                {tieneUSD && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-blue-500">USD</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {transfUSD.toFixed(2)}</p>
                  </div>
                )}
                {tieneBRL && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-green-500">BRL</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {transfBRL.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total a Adeudar</CardTitle>
                <div className="h-4 w-4 rounded-full bg-red-500" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ARS</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalARS)}</p>
                </div>
                {tieneUSD && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-blue-500">USD</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {totalUSD.toFixed(2)}</p>
                  </div>
                )}
                {tieneBRL && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-green-500">BRL</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalBRL.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tarjetas de comisiones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendidos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.total_ventas + ventasMesas.length}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total_ventas} invitados + {ventasMesas.length} mesas
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tu Comisión Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ARS</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(comisLotesARS + comisARS)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lotes: {formatCurrency(comisLotesARS)} + Mesas: {formatCurrency(comisARS)}
                  </p>
                </div>
                {(comisLotesUSD + comisUSD) > 0 && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-blue-500">USD</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      USD {(comisLotesUSD + comisUSD).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lotes: USD {comisLotesUSD.toFixed(2)} + Mesas: USD {comisUSD.toFixed(2)}
                    </p>
                  </div>
                )}
                {(comisLotesBRL + comisBRL) > 0 && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-green-500">BRL</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      R$ {(comisLotesBRL + comisBRL).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lotes: R$ {comisLotesBRL.toFixed(2)} + Mesas: R$ {comisBRL.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comisiones por lote (separadas por moneda) — usa el mismo porLote que los totales */}
          {ventas.length > 0 && (() => {
            const lotesList = Object.values(porLote).sort((a, b) => (a.lote_nombre || '').localeCompare(b.lote_nombre || ''))
            if (lotesList.length === 0) return null

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Comisiones por Lote
                  </CardTitle>
                  <CardDescription>
                    Detalle de tus ganancias por cada tipo de lote vendido (sin sumar monedas distintas)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lotesList.map((lote: any) => (
                      <div
                        key={lote.uuid_lote}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-semibold text-base">{lote.lote_nombre}</h4>
                              {lote.lote_es_vip ? (
                                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs">
                                  <Crown className="h-3 w-3" />
                                  VIP
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Ticket className="h-3 w-3" />
                                  Normal
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <div className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                              {formatCurrency(Number(lote.comision_por_moneda.ARS || 0))}
                              <span className="ml-1 text-xs text-muted-foreground font-normal">ARS</span>
                            </div>
                            {Number(lote.comision_por_moneda.USD || 0) > 0 && (
                              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                USD {Number(lote.comision_por_moneda.USD).toFixed(2)}
                              </div>
                            )}
                            {Number(lote.comision_por_moneda.BRL || 0) > 0 && (
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                R$ {Number(lote.comision_por_moneda.BRL).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Ventas:</span>
                            <span className="ml-1 font-medium">{lote.cantidad_ventas}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Precio (ARS):</span>
                            <span className="ml-1 font-medium">{formatCurrency(Number(lote.lote_precio))}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Comisión:</span>
                            <span className="ml-1 font-medium text-yellow-600 dark:text-yellow-400">
                              {lote.comision_tipo === 'monto'
                                ? `ARS ${formatCurrency(Number(lote.comision_ars ?? lote.comision_rrpp_monto ?? 0))} · USD ${Number(lote.comision_usd ?? 0).toFixed(2)} · BRL ${Number(lote.comision_reales ?? 0).toFixed(2)}`
                                : `${Number(lote.comision_rrpp_porcentaje).toFixed(2)}%`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Ventas de Mesas */}
          {ventasMesas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Ventas de Mesas
                </CardTitle>
                <CardDescription>
                  Mesas vendidas en este evento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mesa ventas - Vista desktop */}
                <div className="hidden md:block overflow-x-auto -mx-1">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Comisión</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventasMesas.map((vm) => (
                        <TableRow key={vm.id}>
                          <TableCell className="font-medium">
                            {vm.mesa_nombre ?? '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {vm.cliente_nombre || '-'}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate text-xs font-mono" title={vm.cliente_dni}>{vm.cliente_dni}</TableCell>
                          <TableCell>
                            <Badge className={getMetodoPagoBadgeColor(vm.metodo_pago || 'efectivo')}>
                              {(vm.metodo_pago || 'efectivo').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <div className="flex items-center justify-end gap-1.5">
                              {vm.moneda && vm.moneda !== 'ARS' && (
                                <Badge className={vm.moneda === 'USD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs'}>
                                  {vm.moneda}
                                </Badge>
                              )}
                              <span className={vm.moneda === 'USD' ? 'text-blue-600 dark:text-blue-400' : vm.moneda === 'BRL' ? 'text-green-600 dark:text-green-400' : ''}>
                                {MONEDA_SIMBOLO[vm.moneda ?? 'ARS']}{vm.precio_venta.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-yellow-600 dark:text-yellow-400 font-medium">
                            {vm.moneda && vm.moneda !== 'ARS'
                              ? `${MONEDA_SIMBOLO[vm.moneda]}${vm.comision_calculada.toFixed(2)}`
                              : formatCurrency(vm.comision_calculada)
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatFecha(vm.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mesa ventas - Vista móvil */}
                <div className="md:hidden space-y-4">
                  {ventasMesas.map((vm) => (
                    <Card key={vm.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            {vm.mesa_nombre && (
                              <p className="text-xs font-semibold text-primary mb-0.5">{vm.mesa_nombre}</p>
                            )}
                            <h3 className="font-semibold">{vm.cliente_nombre || 'Sin nombre'}</h3>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">DNI: {vm.cliente_dni}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {vm.moneda && vm.moneda !== 'ARS' && (
                              <Badge className={vm.moneda === 'USD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs'}>
                                {vm.moneda}
                              </Badge>
                            )}
                            <span className={`text-base font-bold${vm.moneda === 'USD' ? ' text-blue-600 dark:text-blue-400' : vm.moneda === 'BRL' ? ' text-green-600 dark:text-green-400' : ''}`}>
                              {MONEDA_SIMBOLO[vm.moneda ?? 'ARS']}{vm.precio_venta.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            Comisión: <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                              {vm.moneda && vm.moneda !== 'ARS'
                                ? `${MONEDA_SIMBOLO[vm.moneda]}${vm.comision_calculada.toFixed(2)}`
                                : formatCurrency(vm.comision_calculada)
                              }
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(vm.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Totales de mesas */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Mesas</div>
                      <div className="text-xl font-bold">{ventasMesas.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Comisión Mesas</div>
                      <div className="space-y-0.5">
                        <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                          {formatCurrency(comisARS)}
                          <span className="ml-1 text-xs text-muted-foreground font-normal">ARS</span>
                        </div>
                        {comisUSD > 0 && (
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">USD {comisUSD.toFixed(2)}</div>
                        )}
                        {comisBRL > 0 && (
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">R$ {comisBRL.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de ventas */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Ventas</CardTitle>
              <CardDescription>
                Historial completo de tus ventas para este evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando ventas...
                </div>
              ) : ventas.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-muted-foreground">
                    No hay ventas registradas para este evento
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista desktop */}
                  <div className="hidden md:block overflow-x-auto -mx-1">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invitado</TableHead>
                          <TableHead>Evento / Lote</TableHead>
                          <TableHead>Método de Pago</TableHead>
                          <TableHead className="text-right text-xs">Efectivo</TableHead>
                          <TableHead className="text-right text-xs">Transferencia</TableHead>
                          <TableHead className="text-right text-xs">Total</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventas.map((venta) => {
                          if (!venta.invitado || !venta.evento || !venta.lote) {
                            return null // Skip ventas con datos incompletos
                          }
                          return (
                          <TableRow key={venta.id}>
                            <TableCell className="font-medium">
                              <div>{venta.invitado.nombre} {venta.invitado.apellido}</div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{venta.evento.nombre}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{venta.lote.nombre}</span>
                                  {venta.lote.es_vip ? (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs h-5">
                                      <Crown className="h-2.5 w-2.5" />
                                      VIP
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 text-xs h-5">
                                      <Ticket className="h-2.5 w-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getMetodoPagoBadgeColor(venta.metodo_pago)}>
                                {venta.metodo_pago.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {venta.monto_efectivo > 0 ? (
                                <span className="text-green-600 font-medium">
                                  {formatMonto(monedaOf(venta.moneda), Number(venta.monto_efectivo))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {venta.monto_transferencia > 0 ? (
                                <span className="text-blue-600 font-medium">
                                  {formatMonto(monedaOf(venta.moneda), Number(venta.monto_transferencia))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold">
                              {formatMonto(monedaOf(venta.moneda), Number(venta.monto_total))}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatFecha(venta.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deleting === venta.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                      <span className="block">
                                        Se eliminará la venta y la entrada de <strong>{venta.invitado?.nombre} {venta.invitado?.apellido}</strong>.
                                      </span>
                                      <span className="block font-semibold text-destructive">
                                        El cliente NO podrá ingresar con ese QR. Esta acción no se puede deshacer.
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteVenta(venta)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vista móvil */}
                  <div className="md:hidden space-y-4">
                    {ventas.map((venta) => {
                      if (!venta.invitado || !venta.evento || !venta.lote) {
                        return null // Skip ventas con datos incompletos
                      }
                      return (
                      <Card key={venta.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">
                                  {venta.invitado.nombre} {venta.invitado.apellido}
                                </h3>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {venta.evento.nombre}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {venta.lote.nombre}
                                  </p>
                                  {venta.lote.es_vip ? (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs h-4">
                                      <Crown className="h-2.5 w-2.5" />
                                      VIP
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 text-xs h-4">
                                      <Ticket className="h-2.5 w-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Badge className={getMetodoPagoBadgeColor(venta.metodo_pago)}>
                                {venta.metodo_pago.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Efectivo</p>
                                <p className="text-sm font-medium text-green-600">
                                  {formatMonto(monedaOf(venta.moneda), Number(venta.monto_efectivo))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Transferencia</p>
                                <p className="text-sm font-medium text-blue-600">
                                  {formatMonto(monedaOf(venta.moneda), Number(venta.monto_transferencia))}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs font-bold">Total</span>
                              <span className="text-base font-bold">
                                {formatMonto(monedaOf(venta.moneda), Number(venta.monto_total))}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-muted-foreground">
                                {formatFecha(venta.created_at)}
                              </span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive gap-1"
                                    disabled={deleting === venta.id}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                      <span className="block">
                                        Se eliminará la venta y la entrada de <strong>{venta.invitado?.nombre} {venta.invitado?.apellido}</strong>.
                                      </span>
                                      <span className="block font-semibold text-destructive">
                                        El cliente NO podrá ingresar con ese QR. Esta acción no se puede deshacer.
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteVenta(venta)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
        )
      })()}

      {!selectedEvento && !loading && eventos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">
              No hay eventos activos disponibles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
