import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users, DollarSign, Wine, X, QrCode, UserCircle } from 'lucide-react'
import type { Mesa } from '@/types/database'
import { MONEDA_SIMBOLO } from '@/types/database'

interface MesaDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesa: Mesa | null
  onReservar?: () => void
  onVender?: () => void
  onLiberarReserva?: () => void
  onVerQR?: () => void
  loading?: boolean
}

export function MesaDetailDialog({
  open,
  onOpenChange,
  mesa,
  onReservar,
  onVender,
  onLiberarReserva,
  onVerQR,
  loading = false,
}: MesaDetailDialogProps) {
  if (!mesa) return null

  const getEstadoBadge = () => {
    switch (mesa.estado) {
      case 'libre':
        return <Badge className="bg-green-500">Libre</Badge>
      case 'reservado':
        return <Badge className="bg-yellow-500">Reservado</Badge>
      case 'vendido':
        return <Badge className="bg-red-500">Vendido</Badge>
      default:
        return <Badge>Desconocido</Badge>
    }
  }

  const comisionDisplay = mesa.comision_tipo === 'porcentaje'
    ? `${mesa.comision_rrpp_porcentaje}%`
    : `$${mesa.comision_rrpp_monto}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background/60 backdrop-blur-md border border-border/40 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mesa.nombre}
            {getEstadoBadge()}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalle de la mesa</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-background/40 border border-border/30 shadow-sm">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Escaneos QR</span>
                </div>
                <span className="font-semibold">{mesa.escaneos_seguridad_count}/{mesa.max_personas}</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4 mt-0.5" />
                  <span className="text-sm">Precio</span>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="font-semibold">
                    {MONEDA_SIMBOLO['ARS']}{mesa.precio.toFixed(2)}
                    <span className="ml-1 text-xs text-muted-foreground font-normal">ARS</span>
                  </div>
                  {mesa.precio_usd != null && (
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {MONEDA_SIMBOLO['USD']}{mesa.precio_usd.toFixed(2)}
                      <span className="ml-1 text-xs opacity-75">USD</span>
                    </div>
                  )}
                  {mesa.precio_reales != null && (
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {MONEDA_SIMBOLO['BRL']}{mesa.precio_reales.toFixed(2)}
                      <span className="ml-1 text-xs opacity-75">BRL</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Comisión RRPP</span>
                </div>
                <span className="font-semibold">{comisionDisplay}</span>
              </div>

              {mesa.rrpp && (mesa.estado === 'reservado' || mesa.estado === 'vendido') && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="h-4 w-4" />
                    <span className="text-sm">RRPP</span>
                  </div>
                  <span className="font-semibold">{mesa.rrpp.nombre} {mesa.rrpp.apellido}</span>
                </div>
              )}

              {mesa.tiene_consumicion && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wine className="h-4 w-4" />
                      <span className="text-sm">Consumición</span>
                    </div>
                    <Badge variant={mesa.consumicion_entregada ? 'default' : 'secondary'}>
                      {mesa.consumicion_entregada ? 'Entregada' : 'Pendiente'}
                    </Badge>
                  </div>
                  {mesa.detalle_consumicion && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {mesa.detalle_consumicion}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {mesa.estado === 'libre' && onReservar && (
              <Button
                onClick={onReservar}
                disabled={loading}
                className="w-full bg-primary/60 hover:bg-primary/80"
              >
                Reservar Mesa
              </Button>
            )}

            {(mesa.estado === 'libre' || mesa.estado === 'reservado') && onVender && (
              <Button
                onClick={onVender}
                disabled={loading}
                className="w-full bg-primary/60 hover:bg-primary/80"
              >
                {mesa.estado === 'reservado' ? 'Confirmar Venta' : 'Vender Mesa'}
              </Button>
            )}

            {mesa.estado === 'reservado' && onLiberarReserva && (
              <Button
                onClick={onLiberarReserva}
                disabled={loading}
                variant="destructive"
                className="w-full bg-destructive/60 hover:bg-destructive/80"
              >
                Liberar Reserva
              </Button>
            )}

            {mesa.estado === 'vendido' && onVerQR && (
              <Button
                onClick={onVerQR}
                disabled={loading}
                className="w-full gap-2 bg-primary/60 hover:bg-primary/80"
              >
                <QrCode className="h-4 w-4" />
                Ver Código QR
              </Button>
            )}

            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full gap-2 bg-background/40 hover:bg-background/60"
            >
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
