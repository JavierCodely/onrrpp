import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Crown, X } from 'lucide-react'
import type { InvitadoFormData } from '../types'
import type { Lote } from '@/types/database'
import type { ClienteCheckResult } from '@/services/clientes.service'

interface InvitadoFormFieldsProps {
  formData: InvitadoFormData
  onFormDataChange: (data: Partial<InvitadoFormData>) => void
  departamentos: string[]
  localidades: string[]
  onDepartamentoChange: (value: string) => void
  lotesDisponibles: Lote[]
  onLoteChange: (value: string) => void
  selectedLoteEsVip: boolean
  profileImagePreview: string
  onProfileImageChange: (file: File | null) => void
  onProfileImagePreviewClear: () => void
  clienteEncontrado: ClienteCheckResult | null
  isEditMode: boolean
}

export function InvitadoFormFields({
  formData,
  onFormDataChange,
  departamentos,
  localidades,
  onDepartamentoChange,
  lotesDisponibles,
  onLoteChange,
  selectedLoteEsVip,
  profileImagePreview,
  onProfileImageChange,
  onProfileImagePreviewClear,
  clienteEncontrado,
  isEditMode,
}: InvitadoFormFieldsProps) {
  const isFieldDisabled = !isEditMode && !!clienteEncontrado

  return (
    <>
      {/* Nombre y Apellido */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="invitado-nombre"
            value={formData.nombre}
            onChange={(e) => onFormDataChange({ nombre: e.target.value })}
            autoComplete="off"
            required
            disabled={isFieldDisabled}
            className={isFieldDisabled ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido</Label>
          <Input
            id="apellido"
            name="invitado-apellido"
            value={formData.apellido}
            onChange={(e) => onFormDataChange({ apellido: e.target.value })}
            autoComplete="off"
            required
            disabled={isFieldDisabled}
            className={isFieldDisabled ? 'bg-muted' : ''}
          />
        </div>
      </div>

      {/* Edad y Sexo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edad">Edad</Label>
          <Input
            id="edad"
            name="invitado-edad"
            type="number"
            min="1"
            max="100"
            value={formData.edad}
            onChange={(e) => onFormDataChange({ edad: e.target.value })}
            required
            disabled={isFieldDisabled}
            className={isFieldDisabled ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sexo">Sexo *</Label>
          <Select
            name="invitado-sexo"
            value={formData.sexo}
            onValueChange={(value: 'hombre' | 'mujer') => onFormDataChange({ sexo: value })}
            required
            disabled={isFieldDisabled}
          >
            <SelectTrigger id="sexo" className={isFieldDisabled ? 'bg-muted' : ''}>
              <SelectValue placeholder="Seleccionar sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hombre">Hombre</SelectItem>
              <SelectItem value="mujer">Mujer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Departamento y Localidad */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departamento">Departamento (Municipio) *</Label>
          {isFieldDisabled ? (
            <Input
              id="departamento"
              value={formData.departamento}
              disabled
              className="bg-muted"
            />
          ) : (
            <Select
              name="invitado-departamento"
              value={formData.departamento}
              onValueChange={onDepartamentoChange}
              required
            >
              <SelectTrigger id="departamento">
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent className="max-h-[40vh] overflow-y-auto">
                {departamentos.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="localidad">Localidad *</Label>
          {isFieldDisabled ? (
            <Input
              id="localidad"
              value={formData.localidad}
              disabled
              className="bg-muted"
            />
          ) : (
            <Select
              name="invitado-localidad"
              value={formData.localidad}
              onValueChange={(value) => onFormDataChange({ localidad: value })}
              disabled={!formData.departamento}
              required
            >
              <SelectTrigger id="localidad">
                <SelectValue placeholder="Seleccionar localidad" />
              </SelectTrigger>
              <SelectContent className="max-h-[40vh] overflow-y-auto">
                {localidades.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Lote */}
      <div className="space-y-2">
        <Label htmlFor="lote">Lote *</Label>
        <Select
          name="invitado-lote"
          value={formData.uuid_lote}
          onValueChange={onLoteChange}
          required
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
                    {lote.es_vip && <span>👑</span>}
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
          <p className="text-xs text-muted-foreground">
            No hay lotes disponibles para tu grupo en este evento
          </p>
        )}
      </div>

      {/* Imagen de perfil VIP */}
      {selectedLoteEsVip && (
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Label htmlFor="profile_image">Imagen de Perfil VIP *</Label>
            <Badge variant="default" className="bg-yellow-500">
              <Crown className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          </div>
          <div className="space-y-2">
            {profileImagePreview && (
              <div className="relative w-32 h-32 mx-auto">
                <img
                  src={profileImagePreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover rounded-lg border-2 border-yellow-500"
                  loading="lazy"
                  decoding="async"
                />
                <button
                  type="button"
                  onClick={onProfileImagePreviewClear}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <Input
              id="profile_image"
              name="invitado-profile-image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onProfileImageChange(file)
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Formato: JPG, PNG. Tamaño máximo: 5MB
            </p>
          </div>
        </div>
      )}
    </>
  )
}
