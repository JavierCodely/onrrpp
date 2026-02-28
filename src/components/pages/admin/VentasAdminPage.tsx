import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService } from '@/services/eventos.service'
import {
  getVentasResumenByEvento,
  actualizarAcreditacionRRPP,
  type VentaRRPPResumen,
} from '@/services/ventas-admin.service'
import type { Evento, TipoMoneda } from '@/types/database'
import { MONEDA_LABELS } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { DollarSign, Users, Calendar, TrendingUp, Receipt, CheckCircle2, UtensilsCrossed } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

export function VentasAdminPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [ventasResumen, setVentasResumen] = useState<VentaRRPPResumen[]>([])
  const [filteredVentas, setFilteredVentas] = useState<VentaRRPPResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [searchRRPP, setSearchRRPP] = useState('')
  const [updatingAcreditacion, setUpdatingAcreditacion] = useState<string | null>(null)
  const [filtroEntradas, setFiltroEntradas] = useState<'todas' | 'acreditadas' | 'no_acreditadas'>('todas')
  const [filtroComision, setFiltroComision] = useState<'todas' | 'acreditadas' | 'no_acreditadas'>('todas')
  const [mostrarMesas, setMostrarMesas] = useState(true)
  const [mostrarLotes, setMostrarLotes] = useState(true)
  const [filtroMoneda, setFiltroMoneda] = useState<TipoMoneda | 'todas'>('todas')

  useEffect(() => {
    loadEventos()
  }, [user])

  useEffect(() => {
    if (selectedEvento) {
      loadVentasResumen()
    }
  }, [selectedEvento])

  useEffect(() => {
    let filtered = ventasResumen

    // Filtrar por nombre de RRPP
    if (searchRRPP) {
      filtered = filtered.filter(
        (v) =>
          v.nombre_rrpp.toLowerCase().includes(searchRRPP.toLowerCase()) ||
          v.apellido_rrpp.toLowerCase().includes(searchRRPP.toLowerCase())
      )
    }

    // Excluir filas que solo tienen el tipo oculto
    if (!mostrarMesas && !mostrarLotes) {
      filtered = []
    } else if (!mostrarMesas) {
      filtered = filtered.filter((v) => v.ventas.length > 0)
    } else if (!mostrarLotes) {
      filtered = filtered.filter((v) => v.mesas.length > 0)
    }

    // Filtrar por estado de entradas acreditadas
    if (filtroEntradas === 'acreditadas') {
      filtered = filtered.filter((v) => v.todas_entradas_acreditadas)
    } else if (filtroEntradas === 'no_acreditadas') {
      filtered = filtered.filter((v) => !v.todas_entradas_acreditadas)
    }

    // Filtrar por estado de comisión acreditada
    if (filtroComision === 'acreditadas') {
      filtered = filtered.filter((v) => v.todas_comisiones_acreditadas)
    } else if (filtroComision === 'no_acreditadas') {
      filtered = filtered.filter((v) => !v.todas_comisiones_acreditadas)
    }

    // Filtrar por moneda: solo mostrar RRPP que tengan ventas o mesas en esa moneda
    if (filtroMoneda !== 'todas') {
      filtered = filtered.map((v) => ({
        ...v,
        ventas: v.ventas.filter((venta) => venta.moneda === filtroMoneda),
        mesas: v.mesas.filter((mesa) => mesa.moneda === filtroMoneda),
      })).filter((v) => v.ventas.length > 0 || v.mesas.length > 0)
    }

    // Ordenar de mayor a menor por total a acreditar
    filtered.sort((a, b) => b.total_a_acreditar - a.total_a_acreditar)

    setFilteredVentas(filtered)
  }, [searchRRPP, ventasResumen, filtroEntradas, filtroComision, mostrarMesas, mostrarLotes, filtroMoneda])

  const loadEventos = async () => {
    if (!user) return

    const { data, error } = await eventosService.getEventos()
    if (error) {
      toast.error('Error al cargar eventos', { description: error.message })
    } else if (data) {
      setEventos(data)
    }
  }

  const loadVentasResumen = async () => {
    if (!selectedEvento) return

    setLoading(true)
    const { data, error } = await getVentasResumenByEvento(selectedEvento)
    if (error) {
      toast.error('Error al cargar ventas', { description: error.message })
    } else if (data) {
      setVentasResumen(data)
      setFilteredVentas(data)
    }
    setLoading(false)
  }

  const handleAcreditarEntradas = async (rrppId: string, acreditar: boolean) => {
    setUpdatingAcreditacion(rrppId)
    const { error } = await actualizarAcreditacionRRPP(selectedEvento, rrppId, acreditar, undefined)

    if (error) {
      toast.error('Error al actualizar acreditación', { description: error.message })
    } else {
      toast.success(acreditar ? 'Entradas acreditadas' : 'Acreditación de entradas removida')
      loadVentasResumen()
    }
    setUpdatingAcreditacion(null)
  }

  const handleAcreditarComision = async (rrppId: string, acreditar: boolean) => {
    setUpdatingAcreditacion(rrppId)
    const { error } = await actualizarAcreditacionRRPP(selectedEvento, rrppId, undefined, acreditar)

    if (error) {
      toast.error('Error al actualizar comisión', { description: error.message })
    } else {
      toast.success(acreditar ? 'Comisión acreditada' : 'Acreditación de comisión removida')
      loadVentasResumen()
    }
    setUpdatingAcreditacion(null)
  }

  // Calcular totales generales respetando ambos filtros
  const totalesGenerales = filteredVentas.reduce(
    (acc, rrpp) => {
      const mesasTransf   = mostrarMesas  ? rrpp.mesas.reduce((s, m) => s + m.monto_transferencia, 0) : 0
      const mesasEfect    = mostrarMesas  ? rrpp.mesas.reduce((s, m) => s + m.monto_efectivo, 0)      : 0
      const mesasTotal    = mostrarMesas  ? rrpp.mesas.reduce((s, m) => s + m.precio_venta, 0)        : 0
      const mesasComision = mostrarMesas  ? rrpp.mesas.reduce((s, m) => s + m.comision_calculada, 0)  : 0

      const lotesTransf   = mostrarLotes  ? rrpp.ventas.reduce((s, v) => s + v.monto_transferencia, 0) : 0
      const lotesEfect    = mostrarLotes  ? rrpp.ventas.reduce((s, v) => s + v.monto_efectivo, 0)      : 0
      const lotesTotal    = mostrarLotes  ? rrpp.ventas.reduce((s, v) => s + v.monto_total, 0)         : 0
      const lotesComision = mostrarLotes
        ? rrpp.total_comisiones - rrpp.mesas.reduce((s, m) => s + m.comision_calculada, 0)
        : 0

      // Totales por moneda
      const ventasARS = mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'ARS') : []
      const ventasUSD = mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'USD') : []
      const ventasBRL = mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'BRL') : []
      const mesasARS  = mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'ARS')  : []
      const mesasUSD  = mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'USD')  : []
      const mesasBRL  = mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'BRL')  : []

      return {
        totalVentas:        acc.totalVentas        + (mostrarLotes ? rrpp.ventas.length : 0) + (mostrarMesas ? rrpp.mesas.length : 0),
        totalTransferencia: acc.totalTransferencia + lotesTransf  + mesasTransf,
        totalEfectivo:      acc.totalEfectivo      + lotesEfect   + mesasEfect,
        totalAcreditar:     acc.totalAcreditar     + lotesTotal   + mesasTotal,
        totalComisiones:    acc.totalComisiones    + lotesComision + mesasComision,
        // Por moneda — total a acreditar
        totalARS: acc.totalARS
          + ventasARS.reduce((s, v) => s + v.monto_total, 0)
          + mesasARS.reduce((s, m) => s + m.precio_venta, 0),
        totalUSD: acc.totalUSD
          + ventasUSD.reduce((s, v) => s + v.monto_total, 0)
          + mesasUSD.reduce((s, m) => s + m.precio_venta, 0),
        totalBRL: acc.totalBRL
          + ventasBRL.reduce((s, v) => s + v.monto_total, 0)
          + mesasBRL.reduce((s, m) => s + m.precio_venta, 0),
        // Por moneda — transferencia
        transfARS: acc.transfARS
          + ventasARS.reduce((s, v) => s + v.monto_transferencia, 0)
          + mesasARS.reduce((s, m) => s + m.monto_transferencia, 0),
        transfUSD: acc.transfUSD
          + ventasUSD.reduce((s, v) => s + v.monto_transferencia, 0)
          + mesasUSD.reduce((s, m) => s + m.monto_transferencia, 0),
        transfBRL: acc.transfBRL
          + ventasBRL.reduce((s, v) => s + v.monto_transferencia, 0)
          + mesasBRL.reduce((s, m) => s + m.monto_transferencia, 0),
        // Por moneda — efectivo
        efectARS: acc.efectARS
          + ventasARS.reduce((s, v) => s + v.monto_efectivo, 0)
          + mesasARS.reduce((s, m) => s + m.monto_efectivo, 0),
        efectUSD: acc.efectUSD
          + ventasUSD.reduce((s, v) => s + v.monto_efectivo, 0)
          + mesasUSD.reduce((s, m) => s + m.monto_efectivo, 0),
        efectBRL: acc.efectBRL
          + ventasBRL.reduce((s, v) => s + v.monto_efectivo, 0)
          + mesasBRL.reduce((s, m) => s + m.monto_efectivo, 0),
        // Por moneda — comisiones (lotes van a ARS; mesas se desglosan por moneda)
        comisARS: acc.comisARS + lotesComision + (mostrarMesas ? mesasARS.reduce((s, m) => s + m.comision_calculada, 0) : 0),
        comisUSD: acc.comisUSD + (mostrarMesas ? mesasUSD.reduce((s, m) => s + m.comision_calculada, 0) : 0),
        comisBRL: acc.comisBRL + (mostrarMesas ? mesasBRL.reduce((s, m) => s + m.comision_calculada, 0) : 0),
        cantARS: acc.cantARS + ventasARS.length + mesasARS.length,
        cantUSD: acc.cantUSD + ventasUSD.length + mesasUSD.length,
        cantBRL: acc.cantBRL + ventasBRL.length + mesasBRL.length,
      }
    },
    {
      totalVentas: 0, totalTransferencia: 0, totalEfectivo: 0,
      totalAcreditar: 0, totalComisiones: 0,
      totalARS: 0, totalUSD: 0, totalBRL: 0,
      transfARS: 0, transfUSD: 0, transfBRL: 0,
      efectARS: 0, efectUSD: 0, efectBRL: 0,
      comisARS: 0, comisUSD: 0, comisBRL: 0,
      cantARS: 0, cantUSD: 0, cantBRL: 0,
    }
  )


  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Ventas y Acreditaciones</h1>
        <p className="text-muted-foreground">Gestiona las acreditaciones de entradas y comisiones</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="evento">Evento *</Label>
              <Select value={selectedEvento} onValueChange={setSelectedEvento}>
                <SelectTrigger id="evento">
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

            <div className="space-y-2">
              <Label htmlFor="search">Buscar RRPP</Label>
              <Input
                id="search"
                type="text"
                placeholder="Nombre o apellido..."
                value={searchRRPP}
                onChange={(e) => setSearchRRPP(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtro-entradas">Filtrar Entradas</Label>
              <Select value={filtroEntradas} onValueChange={(value: any) => setFiltroEntradas(value)}>
                <SelectTrigger id="filtro-entradas">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="acreditadas">✓ Acreditadas</SelectItem>
                  <SelectItem value="no_acreditadas">✗ No Acreditadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtro-comision">Filtrar Comisiones</Label>
              <Select value={filtroComision} onValueChange={(value: any) => setFiltroComision(value)}>
                <SelectTrigger id="filtro-comision">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="acreditadas">✓ Acreditadas</SelectItem>
                  <SelectItem value="no_acreditadas">✗ No Acreditadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtro-moneda">Moneda</Label>
              <Select value={filtroMoneda} onValueChange={(value: any) => setFiltroMoneda(value)}>
                <SelectTrigger id="filtro-moneda">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las monedas</SelectItem>
                  <SelectItem value="ARS">{MONEDA_LABELS['ARS']}</SelectItem>
                  <SelectItem value="USD">{MONEDA_LABELS['USD']}</SelectItem>
                  <SelectItem value="BRL">{MONEDA_LABELS['BRL']}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 pb-1">
              <div className="flex items-center gap-3">
                <Switch
                  id="mostrar-lotes"
                  checked={mostrarLotes}
                  onCheckedChange={setMostrarLotes}
                />
                <Label htmlFor="mostrar-lotes" className="flex items-center gap-1.5 cursor-pointer">
                  <Receipt className="h-4 w-4" />
                  Ventas de Lotes
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="mostrar-mesas"
                  checked={mostrarMesas}
                  onCheckedChange={setMostrarMesas}
                />
                <Label htmlFor="mostrar-mesas" className="flex items-center gap-1.5 cursor-pointer">
                  <UtensilsCrossed className="h-4 w-4" />
                  Ventas de Mesas
                </Label>
              </div>
            </div>
          </div>

          {/* Mostrar filtros activos */}
          {(filtroEntradas !== 'todas' || filtroComision !== 'todas' || !mostrarMesas || !mostrarLotes) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {filtroEntradas !== 'todas' && (
                <Badge variant="secondary" className="gap-1">
                  Entradas: {filtroEntradas === 'acreditadas' ? '✓ Acreditadas' : '✗ No Acreditadas'}
                </Badge>
              )}
              {filtroComision !== 'todas' && (
                <Badge variant="secondary" className="gap-1">
                  Comisiones: {filtroComision === 'acreditadas' ? '✓ Acreditadas' : '✗ No Acreditadas'}
                </Badge>
              )}
              {!mostrarLotes && (
                <Badge variant="secondary" className="gap-1">
                  <Receipt className="h-3 w-3" />
                  Lotes ocultos
                </Badge>
              )}
              {!mostrarMesas && (
                <Badge variant="secondary" className="gap-1">
                  <UtensilsCrossed className="h-3 w-3" />
                  Mesas ocultas
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totales generales */}
      {selectedEvento && filteredVentas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Total Ventas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total Ventas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ARS</p>
                <p className="text-2xl font-bold">{totalesGenerales.cantARS}</p>
              </div>
              {totalesGenerales.cantUSD > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-blue-500">USD</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalesGenerales.cantUSD}</p>
                </div>
              )}
              {totalesGenerales.cantBRL > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-green-500">BRL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalesGenerales.cantBRL}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transferencias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Transferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ARS</p>
                <p className="text-2xl font-bold">{formatCurrency(totalesGenerales.transfARS)}</p>
              </div>
              {totalesGenerales.transfUSD > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-blue-500">USD</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {totalesGenerales.transfUSD.toFixed(2)}</p>
                </div>
              )}
              {totalesGenerales.transfBRL > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-green-500">BRL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalesGenerales.transfBRL.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Efectivo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Efectivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ARS</p>
                <p className="text-2xl font-bold">{formatCurrency(totalesGenerales.efectARS)}</p>
              </div>
              {totalesGenerales.efectUSD > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-blue-500">USD</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {totalesGenerales.efectUSD.toFixed(2)}</p>
                </div>
              )}
              {totalesGenerales.efectBRL > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-green-500">BRL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalesGenerales.efectBRL.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total a Acreditar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total a Acreditar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ARS</p>
                <p className="text-2xl font-bold">{formatCurrency(totalesGenerales.totalARS)}</p>
              </div>
              {totalesGenerales.totalUSD > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-blue-500">USD</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {totalesGenerales.totalUSD.toFixed(2)}</p>
                </div>
              )}
              {totalesGenerales.totalBRL > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-green-500">BRL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalesGenerales.totalBRL.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Comisiones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Comisiones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ARS</p>
                <p className="text-2xl font-bold">{formatCurrency(totalesGenerales.comisARS)}</p>
              </div>
              {totalesGenerales.comisUSD > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-blue-500">USD</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">USD {totalesGenerales.comisUSD.toFixed(2)}</p>
                </div>
              )}
              {totalesGenerales.comisBRL > 0 && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-green-500">BRL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalesGenerales.comisBRL.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Tabla de ventas */}
      {selectedEvento && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ventas por RRPP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando ventas...</p>
              </div>
            ) : filteredVentas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay ventas para este evento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RRPP</TableHead>
                      <TableHead>Ventas</TableHead>
                      <TableHead className="text-right">Transferencia</TableHead>
                      <TableHead className="text-right">Efectivo</TableHead>
                      <TableHead className="text-right">Total a Acreditar</TableHead>
                      <TableHead className="text-right">Comisiones</TableHead>
                      <TableHead className="text-center">Entradas Acreditadas</TableHead>
                      <TableHead className="text-center">Comisión Acreditada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVentas.map((rrpp) => {
                      // Calcular totales por fila respetando ambos filtros
                      const mesasComision = rrpp.mesas.reduce((s, m) => s + m.comision_calculada, 0)
                      const lotesComision = rrpp.total_comisiones - mesasComision

                      const comisiones     = (mostrarLotes ? lotesComision : 0) + (mostrarMesas ? mesasComision : 0)

                      // Desglose por moneda del RRPP
                      const ventasARS = (mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'ARS') : [])
                      const ventasUSD = (mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'USD') : [])
                      const ventasBRL = (mostrarLotes ? rrpp.ventas.filter(v => v.moneda === 'BRL') : [])
                      const mesasARS  = (mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'ARS')  : [])
                      const mesasUSD  = (mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'USD')  : [])
                      const mesasBRL  = (mostrarMesas ? rrpp.mesas.filter(m => m.moneda === 'BRL')  : [])

                      const totalRowARS  = ventasARS.reduce((s, v) => s + v.monto_total, 0)          + mesasARS.reduce((s, m) => s + m.precio_venta, 0)
                      const totalRowUSD  = ventasUSD.reduce((s, v) => s + v.monto_total, 0)          + mesasUSD.reduce((s, m) => s + m.precio_venta, 0)
                      const totalRowBRL  = ventasBRL.reduce((s, v) => s + v.monto_total, 0)          + mesasBRL.reduce((s, m) => s + m.precio_venta, 0)

                      const transfRowARS = ventasARS.reduce((s, v) => s + v.monto_transferencia, 0)  + mesasARS.reduce((s, m) => s + m.monto_transferencia, 0)
                      const transfRowUSD = ventasUSD.reduce((s, v) => s + v.monto_transferencia, 0)  + mesasUSD.reduce((s, m) => s + m.monto_transferencia, 0)
                      const transfRowBRL = ventasBRL.reduce((s, v) => s + v.monto_transferencia, 0)  + mesasBRL.reduce((s, m) => s + m.monto_transferencia, 0)

                      const efectRowARS  = ventasARS.reduce((s, v) => s + v.monto_efectivo, 0)       + mesasARS.reduce((s, m) => s + m.monto_efectivo, 0)
                      const efectRowUSD  = ventasUSD.reduce((s, v) => s + v.monto_efectivo, 0)       + mesasUSD.reduce((s, m) => s + m.monto_efectivo, 0)
                      const efectRowBRL  = ventasBRL.reduce((s, v) => s + v.monto_efectivo, 0)       + mesasBRL.reduce((s, m) => s + m.monto_efectivo, 0)

                      const tieneUSD = totalRowUSD > 0
                      const tieneBRL = totalRowBRL > 0

                      return (
                      <TableRow key={rrpp.id_rrpp}>
                        <TableCell className="font-medium">
                          {rrpp.nombre_rrpp} {rrpp.apellido_rrpp}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {mostrarLotes && rrpp.lotes.map((lote) => (
                              <div key={lote.id_lote} className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {lote.nombre_lote}: {lote.cantidad_vendida}
                                </Badge>
                              </div>
                            ))}
                            {mostrarMesas && rrpp.mesas.map((m) => (
                              <div key={m.id} className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="gap-1">
                                  <UtensilsCrossed className="h-3 w-3" />
                                  {m.mesa_nombre ?? 'Mesa'}
                                </Badge>
                                {m.moneda !== 'ARS' && (
                                  <Badge className={m.moneda === 'USD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}>
                                    {m.moneda}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div>
                              <p className="text-xs text-muted-foreground">ARS</p>
                              <p>{formatCurrency(transfRowARS)}</p>
                            </div>
                            {tieneUSD && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-blue-500">USD</p>
                                <p className="text-blue-600 dark:text-blue-400">USD {transfRowUSD.toFixed(2)}</p>
                              </div>
                            )}
                            {tieneBRL && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-green-500">BRL</p>
                                <p className="text-green-600 dark:text-green-400">R$ {transfRowBRL.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div>
                              <p className="text-xs text-muted-foreground">ARS</p>
                              <p>{formatCurrency(efectRowARS)}</p>
                            </div>
                            {tieneUSD && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-blue-500">USD</p>
                                <p className="text-blue-600 dark:text-blue-400">USD {efectRowUSD.toFixed(2)}</p>
                              </div>
                            )}
                            {tieneBRL && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-green-500">BRL</p>
                                <p className="text-green-600 dark:text-green-400">R$ {efectRowBRL.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <div className="space-y-1">
                            <div>
                              <p className="text-xs text-muted-foreground font-normal">ARS</p>
                              <p>{formatCurrency(totalRowARS)}</p>
                            </div>
                            {tieneUSD && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-blue-500 font-normal">USD</p>
                                <p className="text-blue-600 dark:text-blue-400">USD {totalRowUSD.toFixed(2)}</p>
                              </div>
                            )}
                            {tieneBRL && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-green-500 font-normal">BRL</p>
                                <p className="text-green-600 dark:text-green-400">R$ {totalRowBRL.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(comisiones)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={rrpp.todas_entradas_acreditadas}
                              onCheckedChange={(checked) =>
                                handleAcreditarEntradas(rrpp.id_rrpp, checked as boolean)
                              }
                              disabled={updatingAcreditacion === rrpp.id_rrpp}
                            />
                            {rrpp.todas_entradas_acreditadas && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={rrpp.todas_comisiones_acreditadas}
                              onCheckedChange={(checked) =>
                                handleAcreditarComision(rrpp.id_rrpp, checked as boolean)
                              }
                              disabled={updatingAcreditacion === rrpp.id_rrpp}
                            />
                            {rrpp.todas_comisiones_acreditadas && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedEvento && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona un evento para ver las ventas</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
