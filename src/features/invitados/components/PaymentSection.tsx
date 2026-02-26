import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InvitadoFormData } from '../types'
import type { MetodoPago } from '@/types/database'

interface PaymentSectionProps {
  formData: InvitadoFormData
  onFormDataChange: (data: Partial<InvitadoFormData>) => void
  selectedLotePrecio: number
  isEditMode: boolean
}

export function PaymentSection({
  formData,
  onFormDataChange,
  selectedLotePrecio,
  isEditMode,
}: PaymentSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">
          {isEditMode ? 'Editar Pago' : 'Información de Pago'}
        </h4>
        <Badge variant="outline" className="text-base font-bold">
          ${selectedLotePrecio.toFixed(2)}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodo_pago">Método de Pago *</Label>
        <Select
          name="venta-metodo-pago"
          value={formData.metodo_pago}
          onValueChange={(value: MetodoPago) => {
            onFormDataChange({
              metodo_pago: value,
              // Auto-completar montos según método
              monto_efectivo: value === 'efectivo' ? selectedLotePrecio.toString() : '0',
              monto_transferencia: value === 'transferencia' ? selectedLotePrecio.toString() : '0',
            })
          }}
          required
        >
          <SelectTrigger id="metodo_pago">
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campo opcional de observaciones */}
      {formData.metodo_pago && (
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones (opcional)</Label>
          <Input
            id="observaciones"
            name="venta-observaciones"
            value={formData.observaciones}
            onChange={(e) => onFormDataChange({ observaciones: e.target.value })}
            placeholder="Ej: Transferencia a cuenta XXX"
          />
        </div>
      )}
    </div>
  )
}
