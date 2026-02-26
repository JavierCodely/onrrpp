import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, ShieldX, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles, RazonRechazoType } from '@/types/database'
import { getRazonLabel } from './scanner.utils'

interface InvitadoRejectedModalProps {
  invitado: InvitadoConDetalles
  rejectionInfo: {
    razon: RazonRechazoType | null
    detalle: string | null
    fecha: string | null
  }
  isProcessingAction: boolean
  onResolveAndAllow: () => void
  onMaintainRejection: () => void
  onNuevoEscaneo: () => void
}

export function InvitadoRejectedModal({
  invitado,
  rejectionInfo,
  isProcessingAction,
  onResolveAndAllow,
  onMaintainRejection,
  onNuevoEscaneo,
}: InvitadoRejectedModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4 border-amber-500 border-2 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
          onClick={onNuevoEscaneo}
          disabled={isProcessingAction}
        >
          <X className="h-5 w-5 text-gray-700" />
        </Button>
        <CardContent className="pt-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center">
              <AlertTriangle className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <div>
              <h2 className="text-2xl font-bold text-amber-600">
                Invitado Rechazado Anteriormente
              </h2>
            </div>

            <div className="space-y-2">
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {invitado.dni}
              </p>
              <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                {invitado.nombre} {invitado.apellido}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Motivo del rechazo:</p>
              <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                {rejectionInfo.razon && getRazonLabel(rejectionInfo.razon)}
              </p>
              {rejectionInfo.detalle && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  {rejectionInfo.detalle}
                </p>
              )}
              {rejectionInfo.fecha && (
                <p className="text-xs text-muted-foreground mt-2">
                  Rechazado el {new Date(rejectionInfo.fecha).toLocaleString('es-AR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            <p className="text-base font-medium text-gray-700 dark:text-gray-300 pt-2">
              ¿El problema fue resuelto?
            </p>

            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={onResolveAndAllow}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                disabled={isProcessingAction}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Resolver y Permitir Ingreso
              </Button>
              <Button
                onClick={onMaintainRejection}
                size="lg"
                variant="outline"
                className="w-full text-lg py-6 border-red-300 text-red-600 hover:bg-red-50"
                disabled={isProcessingAction}
              >
                <ShieldX className="h-5 w-5 mr-2" />
                Mantener Rechazo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
