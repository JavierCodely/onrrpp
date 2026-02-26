import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Crown, User, X } from 'lucide-react'
import type { ClienteCheckResult } from '@/services/clientes.service'
import type { Lote, MetodoPago } from '@/types/database'

interface LoteSelectionStepProps {
  cliente: ClienteCheckResult
  dni: string
  lotesDisponibles: Lote[]
  onConfirm: (data: {
    uuid_lote: string
    metodo_pago?: MetodoPago
    monto_efectivo?: number
    monto_transferencia?: number
    observaciones?: string
    profileImageFile?: File
  }) => void
  onBack: () => void
  isSubmitting: boolean
}

export function LoteSelectionStep({
  cliente,
  dni,
  lotesDisponibles,
  onConfirm,
  onBack,
  isSubmitting,
}: LoteSelectionStepProps) {
  const [selectedLoteId, setSelectedLoteId] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')

  const selectedLote = lotesDisponibles.find(l => l.id === selectedLoteId)
  const loteEsVip = selectedLote?.es_vip || false
  const lotePrecio = selectedLote?.precio || 0
  const requierePago = lotePrecio > 0

  const handleImageChange = (file: File | null) => {
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setProfileImageFile(null)
    setProfileImagePreview('')
  }

  const handleConfirm = () => {
    if (!selectedLoteId) return

    // Validaciones
    if (loteEsVip && !profileImageFile) {
      return // No permitir sin imagen VIP
    }

    if (requierePago && !metodoPago) {
      return // No permitir sin método de pago
    }

    const data: Parameters<typeof onConfirm>[0] = {
      uuid_lote: selectedLoteId,
    }

    if (requierePago && metodoPago) {
      data.metodo_pago = metodoPago
      data.monto_efectivo = metodoPago === 'efectivo' ? lotePrecio : 0
      data.monto_transferencia = metodoPago === 'transferencia' ? lotePrecio : 0
      data.observaciones = observaciones || undefined
    }

    if (profileImageFile) {
      data.profileImageFile = profileImageFile
    }

    onConfirm(data)
  }

  const canConfirm = selectedLoteId &&
    (!loteEsVip || profileImageFile) &&
    (!requierePago || metodoPago)

  return (
    <div className="space-y-4">
      {/* Header con botón volver */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      {/* Resumen del cliente (compacto) */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {cliente.nombre} {cliente.apellido}
            </p>
            <p className="text-sm text-muted-foreground">DNI: {dni}</p>
          </div>
        </div>
      </div>

      {/* Selección de Lote */}
      <div className="space-y-2">
        <Label htmlFor="lote">Seleccionar Lote *</Label>
        <Select
          value={selectedLoteId}
          onValueChange={(value) => {
            setSelectedLoteId(value)
            // Reset método de pago al cambiar lote
            setMetodoPago('')
          }}
        >
          <SelectTrigger id="lote">
            <SelectValue placeholder="Seleccionar lote" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            {lotesDisponibles.map((lote) => {
              const disponibles = lote.cantidad_maxima - lote.cantidad_actual
              const porcentaje = (lote.cantidad_actual / lote.cantidad_maxima) * 100
              const estaLleno = disponibles <= 0
              const ultimasDisponibles = porcentaje > 50 && porcentaje <= 80
              return (
                <SelectItem
                  key={lote.id}
                  value={lote.id}
                  disabled={estaLleno}
                >
                  <div className="flex items-center gap-2">
                    <span>{lote.nombre}</span>
                    {lote.es_vip && <Crown className="h-4 w-4 text-yellow-500" />}
                    <span className="text-xs text-muted-foreground">
                      {lote.precio === 0 ? 'GRATIS' : `$${lote.precio.toFixed(2)}`}
                    </span>
                    {estaLleno && (
                      <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">SOLD OUT</span>
                    )}
                    {ultimasDisponibles && !estaLleno && (
                      <span className="text-xs text-yellow-600 font-medium">Últimas</span>
                    )}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {lotesDisponibles.length === 0 && (
          <p className="text-xs text-destructive">
            No hay lotes disponibles para este evento
          </p>
        )}
      </div>

      {/* Imagen VIP (si lote es VIP) */}
      {loteEsVip && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Label htmlFor="profile_image">Imagen de Perfil VIP *</Label>
            <Badge variant="default" className="bg-yellow-500">
              <Crown className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          </div>
          <div className="space-y-2">
            {profileImagePreview && (
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src={profileImagePreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover rounded-lg border-2 border-yellow-500"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Input
              id="profile_image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageChange(file)
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Formato: JPG, PNG. Tamaño máximo: 5MB
            </p>
          </div>
        </div>
      )}

      {/* Sección de Pago (si lote tiene precio) */}
      {requierePago && selectedLote && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Información de Pago</h4>
            <Badge variant="outline" className="text-base font-bold">
              ${lotePrecio.toFixed(2)}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo_pago">Método de Pago *</Label>
            <Select
              value={metodoPago}
              onValueChange={(value: MetodoPago) => setMetodoPago(value)}
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

          {metodoPago && (
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Input
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Transferencia a cuenta XXX"
              />
            </div>
          )}
        </div>
      )}

      {/* Botón de confirmación */}
      <div className="pt-4">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm || isSubmitting}
          className="w-full h-12"
        >
          {isSubmitting ? 'Creando...' : 'Crear Invitado'}
        </Button>
      </div>
    </div>
  )
}
