import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crown, DollarSign, X } from 'lucide-react'
import type { Lote } from '@/types/database'

export interface LoteSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotes: Lote[]
  loading?: boolean
  onSelectLote: (lote: Lote) => void
  onClose?: () => void
  title?: string
  description?: string
  eventoNombre?: string
  eventoSubtitle?: string
  closeButtonLabel?: string
}

export function LoteSelectionDialog({
  open,
  onOpenChange,
  lotes,
  loading = false,
  onSelectLote,
  onClose,
  title = 'Seleccionar Lote',
  description = 'Selecciona un lote para crear la entrada',
  eventoNombre,
  eventoSubtitle,
  closeButtonLabel = 'Cancelar',
}: LoteSelectionDialogProps) {
  const handleClose = () => {
    onClose?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(eventoNombre || eventoSubtitle) && (
            <div className="text-center pb-4 border-b">
              {eventoNombre && <h3 className="text-xl font-bold">{eventoNombre}</h3>}
              {eventoSubtitle && (
                <p className="text-sm text-muted-foreground">{eventoSubtitle}</p>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando lotes...
            </div>
          ) : lotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay lotes disponibles para este evento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lotes.map((lote) => {
                const disponibles = lote.cantidad_maxima - lote.cantidad_actual
                const porcentaje = (lote.cantidad_actual / lote.cantidad_maxima) * 100
                const estaAgotado = disponibles <= 0
                const ultimasDisponibles = porcentaje > 50 && porcentaje <= 80

                return (
                  <Card
                    key={lote.id}
                    className={`transition-shadow neon-border-subtle ${
                      estaAgotado
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-md'
                    }`}
                    onClick={() => !estaAgotado && onSelectLote(lote)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{lote.nombre}</h4>
                            {lote.es_vip && (
                              <Badge className="bg-yellow-500 gap-1">
                                <Crown className="h-3 w-3" />
                                VIP
                              </Badge>
                            )}
                            {estaAgotado && (
                              <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold gap-1">
                                SOLD OUT
                              </Badge>
                            )}
                            {ultimasDisponibles && !estaAgotado && (
                              <Badge
                                variant="outline"
                                className="text-yellow-600 border-yellow-500 gap-1"
                              >
                                Últimas disponibles
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {lote.precio === 0 ? 'GRATIS' : `$${lote.precio.toFixed(2)}`}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                estaAgotado
                                  ? 'bg-red-500'
                                  : porcentaje > 80
                                    ? 'bg-red-500'
                                    : porcentaje > 50
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(porcentaje, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            {closeButtonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
