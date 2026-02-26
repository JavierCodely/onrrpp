import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  DollarSign,
  Tag,
  Crown,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import type { Evento, Lote } from '@/types/database'

interface LotesManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEvento: Evento | null
  lotes: Lote[]
  onCreateLote: () => void
  onOpenSeguridadDialog: (lote: Lote) => void
  onToggleLoteActivo: (lote: Lote) => void
  onEditLote: (lote: Lote) => void
  onDeleteLote: (lote: Lote) => void
  onClose: () => void
}

export function LotesManagementDialog({
  open,
  onOpenChange,
  selectedEvento,
  lotes,
  onCreateLote,
  onOpenSeguridadDialog,
  onToggleLoteActivo,
  onEditLote,
  onDeleteLote,
  onClose,
}: LotesManagementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Lotes - {selectedEvento?.nombre}</DialogTitle>
          <DialogDescription>
            Administra los lotes de invitados para este evento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            onClick={onCreateLote}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Lote
          </Button>

          {lotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">No hay lotes creados para este evento</p>
              <p className="text-sm mt-2">Crea el primer lote para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lotes.map((lote) => {
                const porcentajeUsado = (lote.cantidad_actual / lote.cantidad_maxima) * 100
                const disponibles = lote.cantidad_maxima - lote.cantidad_actual

                return (
                  <Card key={lote.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-lg">{lote.nombre}</h4>
                            {lote.es_vip && (
                              <Badge className="bg-yellow-500 gap-1">
                                <Crown className="h-3 w-3" />
                                VIP
                              </Badge>
                            )}
                            {lote.grupo ? (
                              <Badge className={`gap-1 ${
                                lote.grupo === 'A' ? 'bg-purple-500 text-white' :
                                lote.grupo === 'B' ? 'bg-cyan-500 text-white' :
                                lote.grupo === 'C' ? 'bg-orange-500 text-white' :
                                'bg-pink-500 text-white'
                              }`}>
                                <Shield className="h-3 w-3" />
                                Grupo {lote.grupo}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Todos
                              </Badge>
                            )}
                            {!lote.activo && (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {lote.precio === 0 ? (
                                  <span className="text-green-600 font-medium">GRATIS</span>
                                ) : (
                                  <span className="font-medium">${lote.precio.toFixed(2)}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>
                                <span className="font-medium">{disponibles}</span> / {lote.cantidad_maxima} disponibles
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{lote.cantidad_actual} usados</span>
                              <span>{porcentajeUsado.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  porcentajeUsado >= 90
                                    ? 'bg-red-500'
                                    : porcentajeUsado >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${porcentajeUsado}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenSeguridadDialog(lote)}
                            title="Asignar seguridad"
                          >
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleLoteActivo(lote)}
                            title={lote.activo ? 'Desactivar lote' : 'Activar lote'}
                          >
                            {lote.activo ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditLote(lote)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteLote(lote)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
