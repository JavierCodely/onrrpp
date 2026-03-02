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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Upload, X } from 'lucide-react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Evento } from '@/types/database'
import { useState } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface EventoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEvento: Evento | null
  formData: { nombre: string; fecha: string }
  setFormData: React.Dispatch<React.SetStateAction<{ nombre: string; fecha: string }>>
  selectedFile: File | null
  previewUrl: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function EventoFormDialog({
  open,
  onOpenChange,
  selectedEvento,
  formData,
  setFormData,
  previewUrl,
  fileInputRef,
  uploading,
  onFileSelect,
  onRemoveImage,
  onSubmit,
  onClose,
}: EventoFormDialogProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedEvento ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
          <DialogDescription>
            {selectedEvento
              ? 'Modifica los datos del evento'
              : 'Completa los datos para crear un nuevo evento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del evento</Label>
              <Input
                id="nombre"
                name="evento-nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Fiesta de Año Nuevo"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha y hora</Label>
              {/* Input clickeable que abre calendario + hora (móvil y escritorio) */}
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal flex items-center ${
                      !formData.fecha ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {formData.fecha
                        ? `${format(new Date(formData.fecha), "d 'de' MMMM yyyy", {
                            locale: es,
                          })} · ${formData.fecha.slice(11, 16)} hs`
                        : 'Selecciona fecha y hora'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(80vw,320px)] max-h-[70vh] overflow-y-auto p-2 space-y-2"
                  side="bottom"
                  align="center"
                >
                  <CalendarComponent
                    mode="single"
                    className="w-full text-xs"
                    selected={formData.fecha ? new Date(formData.fecha) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const currentTime = '00:00'
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        setFormData({
                          ...formData,
                          fecha: `${year}-${month}-${day}T${currentTime}`,
                        })
                        setDatePopoverOpen(false)
                      }
                    }}
                    locale={es}
                  />

                  {/* Hora — dos selects para evitar el input nativo con AM/PM */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.fecha ? formData.fecha.slice(11, 13) : ''}
                      onValueChange={(h) => {
                        const datePart = formData.fecha
                          ? formData.fecha.slice(0, 10)
                          : new Date().toISOString().slice(0, 10)
                        const min = formData.fecha ? formData.fecha.slice(14, 16) : '00'
                        setFormData({ ...formData, fecha: `${datePart}T${h}:${min}` })
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-lg font-bold text-muted-foreground">:</span>

                    <Select
                      value={formData.fecha ? formData.fecha.slice(14, 16) : ''}
                      onValueChange={(m) => {
                        const datePart = formData.fecha
                          ? formData.fecha.slice(0, 10)
                          : new Date().toISOString().slice(0, 10)
                        const h = formData.fecha ? formData.fecha.slice(11, 13) : '00'
                        setFormData({ ...formData, fecha: `${datePart}T${h}:${m}` })
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {MINUTES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner">Banner del evento (opcional)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="banner"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={onFileSelect}
                    ref={fileInputRef}
                    className="cursor-pointer"
                  />
                  {previewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveImage}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamaño recomendado: 1200x600px • Formatos: JPG, PNG, WebP • Máximo: 5MB
                </p>

                {previewUrl && (
                  <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-900">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>{selectedEvento ? 'Guardar cambios' : 'Crear evento'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
