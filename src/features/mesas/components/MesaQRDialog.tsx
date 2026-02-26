import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogPortal } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, DollarSign, Users, Wine, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'
import applicationLogo from '/sponsor/onevents.webp'

interface MesaQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  qrCode: string
  mesaNombre?: string
  sectorNombre?: string
  clienteNombre?: string | null
  precio?: number
  maxPersonas?: number
  detalleConsumicion?: string | null
  eventoBannerUrl?: string | null
  eventoNombre?: string
  eventoFecha?: string
  clubNombre?: string
}

export function MesaQRDialog({
  open,
  onOpenChange,
  qrCode,
  mesaNombre,
  sectorNombre,
  clienteNombre,
  precio,
  maxPersonas,
  detalleConsumicion,
  eventoBannerUrl,
  eventoNombre,
  eventoFecha,
  clubNombre,
}: MesaQRDialogProps) {
  if (!qrCode) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay className={cn(
          "fixed inset-0 z-50 bg-white dark:bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        )} />
        <DialogPrimitive.Content
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md"
          )}
        >
          <DialogHeader>
            <DialogTitle>Código QR de la Mesa</DialogTitle>
            <DialogDescription>
              Comparte este QR
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre del cliente */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">
                {clienteNombre || 'Cliente'}
              </h3>
            </div>

            {/* Información del evento con banner */}
            <div className="relative overflow-hidden rounded-lg border">
              {/* Banner de fondo */}
              {eventoBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${eventoBannerUrl})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
              )}

              {/* Overlay oscuro */}
              <div className="absolute inset-0 bg-black/60" />

              {/* Contenido */}
              <div className="relative flex flex-col items-center justify-center gap-1 p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white" />
                  <span className="font-medium text-white">{eventoNombre}</span>
                  {eventoFecha && (
                    <span className="text-xs text-white/80">{format(new Date(eventoFecha), 'dd MMM yyyy', { locale: es })}</span>
                  )}
                </div>
                {clubNombre && (
                  <div className="text-xs text-white/90">
                    {clubNombre}
                  </div>
                )}
              </div>
            </div>

            {/* Información de la mesa */}
            <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mesaNombre}</span>
                  {sectorNombre && (
                    <span className="text-xs text-muted-foreground">· {sectorNombre}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="h-3 w-3" />
                  {precio != null && (
                    <span className="font-medium">${precio.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>Escaneos QR: <span className="font-medium text-foreground">{maxPersonas}</span></span>
                </div>
                {detalleConsumicion && (
                  <div className="flex items-center gap-1">
                    <Wine className="h-3 w-3" />
                    <span className="font-medium text-foreground">{detalleConsumicion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje de derecho de admisión */}
            <p className="text-xs text-muted-foreground text-center">
              El club se reserva el derecho de admisión
            </p>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <div className="relative">
                <QRCodeSVG
                  id={`qr-mesa-${qrCode}`}
                  value={qrCode}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
                {/* Logo application en el centro */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={applicationLogo}
                    alt="Application"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground font-mono">
              {qrCode}
            </div>

            {/* Mensaje de advertencia */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-100 text-center font-medium">
                El QR es único. No lo compartas con nadie o deberás abonar tu mesa nuevamente.
              </p>
            </div>

            {/* Botón cerrar con logos */}
            <div className="flex items-center justify-between gap-2">
              <img
                src="/sponsor/speed.webp"
                alt="Speed"
                className="h-28 w-auto object-contain"
              />
              <Button
                onClick={() => onOpenChange(false)}
                size="default"
                className="flex-shrink-0 px-8"
              >
                Cerrar
              </Button>
              <img
                src="/sponsor/speed.webp"
                alt="Speed"
                className="h-28 w-auto object-contain"
              />
            </div>
          </div>

          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
