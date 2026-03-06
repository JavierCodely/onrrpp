import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogPortal } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMemo, useRef, useState } from 'react'
import { Calendar, DollarSign, Share2, Users, Wine, X } from 'lucide-react'
import { MONEDA_SIMBOLO } from '@/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import applicationLogo from '/sponsor/onevents.webp'
import { toast } from 'sonner'
import { captureElementToPngBlob, shareOrDownloadPng } from '@/utils/shareCapture'
import { StyledQRCode } from '@/components/ui/StyledQRCode'

interface MesaQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  qrCode: string
  mesaNombre?: string
  sectorNombre?: string
  clienteNombre?: string | null
  precio?: number
  moneda?: string
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
  moneda = 'ARS',
  maxPersonas,
  detalleConsumicion,
  eventoBannerUrl,
  eventoNombre,
  eventoFecha,
  clubNombre,
}: MesaQRDialogProps) {
  if (!qrCode) return null

  const simbolo = MONEDA_SIMBOLO[moneda as keyof typeof MONEDA_SIMBOLO] ?? '$'
  const captureRef = useRef<HTMLDivElement | null>(null)
  const [sharing, setSharing] = useState(false)
  const shareTitle = useMemo(() => `QR Mesa - ${mesaNombre ?? 'Mesa'} - ${clienteNombre ?? 'Cliente'}`.trim(), [mesaNombre, clienteNombre])

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

          <div ref={captureRef} className="space-y-4 py-4 bg-background">
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
                    <span className={`font-medium${moneda === 'USD' ? ' text-blue-600' : moneda === 'BRL' ? ' text-green-600' : ''}`}>
                      {simbolo}{precio.toFixed(2)}
                      {moneda !== 'ARS' && <span className="ml-1 text-xs opacity-75">{moneda}</span>}
                    </span>
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
            <div className="flex justify-center p-4 bg-background rounded-lg border">
              <div className="relative">
                <StyledQRCode value={qrCode} size={320} logoSrc={applicationLogo} />
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

          </div>

          {/* Acciones (no incluidas en la captura) */}
          <div className="flex items-center justify-between gap-2">
            <img
              src="/sponsor/speed.webp"
              alt="Speed"
              className="h-24 w-auto object-contain hidden sm:block"
            />
            <div className="flex flex-1 justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={sharing}
                onClick={async () => {
                  if (!captureRef.current) return
                  try {
                    setSharing(true)
                    const blob = await captureElementToPngBlob(captureRef.current)
                    const result = await shareOrDownloadPng({
                      blob,
                      fileName: shareTitle,
                      title: shareTitle,
                      text: 'QR de mesa',
                    })
                    toast.success(result.method === 'share' ? 'Compartido' : 'Imagen descargada')
                  } catch (e) {
                    toast.error('No se pudo compartir', {
                      description: e instanceof Error ? e.message : 'Error desconocido',
                    })
                  } finally {
                    setSharing(false)
                  }
                }}
                className="px-4"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {sharing ? 'Generando...' : 'Compartir'}
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                size="default"
                className="px-8"
              >
                Cerrar
              </Button>
            </div>
            <img
              src="/sponsor/speed.webp"
              alt="Speed"
              className="h-24 w-auto object-contain hidden sm:block"
            />
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
