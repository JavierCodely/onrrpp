import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Crown, DollarSign, Shield } from 'lucide-react'
import type { Lote, GrupoType } from '@/types/database'

interface LoteFormData {
  nombre: string
  cantidad_maxima: string
  precio: string
  es_vip: boolean
  grupo: GrupoType | '' | 'TODOS'
  comision_tipo: 'monto' | 'porcentaje'
  comision_rrpp_monto: string
  comision_rrpp_porcentaje: string
}

interface LoteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLote: Lote | null
  loteFormData: LoteFormData
  setLoteFormData: React.Dispatch<React.SetStateAction<LoteFormData>>
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function LoteFormDialog({
  open,
  onOpenChange,
  selectedLote,
  loteFormData,
  setLoteFormData,
  onSubmit,
  onClose,
}: LoteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedLote ? 'Editar Lote' : 'Nuevo Lote'}
          </DialogTitle>
          <DialogDescription>
            {selectedLote
              ? 'Modifica los datos del lote'
              : 'Completa los datos para crear un nuevo lote'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lote-nombre">Nombre del lote</Label>
              <Input
                id="lote-nombre"
                value={loteFormData.nombre}
                onChange={(e) =>
                  setLoteFormData({ ...loteFormData, nombre: e.target.value })
                }
                placeholder="Ej: Early Bird, VIP Gold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lote-cantidad">Cantidad máxima</Label>
                <Input
                  id="lote-cantidad"
                  type="number"
                  min="1"
                  value={loteFormData.cantidad_maxima}
                  onChange={(e) =>
                    setLoteFormData({ ...loteFormData, cantidad_maxima: e.target.value })
                  }
                  placeholder="100"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote-precio">Precio</Label>
                <Input
                  id="lote-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={loteFormData.precio}
                  onChange={(e) =>
                    setLoteFormData({ ...loteFormData, precio: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Usa 0 para lotes gratuitos
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lote-vip"
                checked={loteFormData.es_vip}
                onCheckedChange={(checked) =>
                  setLoteFormData({ ...loteFormData, es_vip: checked as boolean })
                }
              />
              <label
                htmlFor="lote-vip"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Crown className="h-4 w-4 text-yellow-500" />
                Es VIP (permite múltiples escaneos)
              </label>
            </div>

            {/* Selector de Grupo */}
            <div className="space-y-2">
              <Label htmlFor="lote-grupo">Grupo</Label>
              <Select
                value={loteFormData.grupo || 'TODOS'}
                onValueChange={(value) =>
                  setLoteFormData({ ...loteFormData, grupo: value as GrupoType | 'TODOS' })
                }
              >
                <SelectTrigger id="lote-grupo">
                  <Shield className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los grupos (visible para todos)</SelectItem>
                  <SelectItem value="A">Grupo A</SelectItem>
                  <SelectItem value="B">Grupo B</SelectItem>
                  <SelectItem value="C">Grupo C</SelectItem>
                  <SelectItem value="D">Grupo D</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si seleccionas un grupo específico, solo los RRPPs de ese grupo podrán ver y vender este lote
              </p>
            </div>

            {/* Sección de comisión RRPP */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Comisión para RRPP
              </h4>

              <div className="space-y-2">
                <Label>Tipo de comisión</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="comision-monto"
                      name="comision_tipo"
                      value="monto"
                      checked={loteFormData.comision_tipo === 'monto'}
                      onChange={(e) =>
                        setLoteFormData({ ...loteFormData, comision_tipo: e.target.value as 'monto' | 'porcentaje' })
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="comision-monto" className="text-sm">
                      Monto fijo en $
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="comision-porcentaje"
                      name="comision_tipo"
                      value="porcentaje"
                      checked={loteFormData.comision_tipo === 'porcentaje'}
                      onChange={(e) =>
                        setLoteFormData({ ...loteFormData, comision_tipo: e.target.value as 'monto' | 'porcentaje' })
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="comision-porcentaje" className="text-sm">
                      Porcentaje %
                    </label>
                  </div>
                </div>
              </div>

              {loteFormData.comision_tipo === 'monto' ? (
                <div className="space-y-2">
                  <Label htmlFor="lote-comision-monto">Comisión en pesos por venta</Label>
                  <Input
                    id="lote-comision-monto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={loteFormData.comision_rrpp_monto}
                    onChange={(e) =>
                      setLoteFormData({ ...loteFormData, comision_rrpp_monto: e.target.value })
                    }
                    placeholder="Ej: 500.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    El RRPP ganará este monto fijo por cada venta de este lote
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="lote-comision-porcentaje">Comisión en porcentaje</Label>
                  <Input
                    id="lote-comision-porcentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={loteFormData.comision_rrpp_porcentaje}
                    onChange={(e) =>
                      setLoteFormData({ ...loteFormData, comision_rrpp_porcentaje: e.target.value })
                    }
                    placeholder="Ej: 15.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    El RRPP ganará este porcentaje del precio de venta
                    {loteFormData.precio && loteFormData.comision_rrpp_porcentaje &&
                      ` (${parseFloat(loteFormData.precio) * parseFloat(loteFormData.comision_rrpp_porcentaje) / 100} pesos por venta)`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {selectedLote ? 'Guardar cambios' : 'Crear lote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
