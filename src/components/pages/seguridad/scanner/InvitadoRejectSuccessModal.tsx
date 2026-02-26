import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldX, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles } from '@/types/database'
import { getRazonLabel } from './scanner.utils'

interface InvitadoRejectSuccessModalProps {
  invitado: InvitadoConDetalles
  onNuevoEscaneo: () => void
}

export function InvitadoRejectSuccessModal({ invitado, onNuevoEscaneo }: InvitadoRejectSuccessModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4 border-red-500 border-2 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
          onClick={onNuevoEscaneo}
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
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
              <ShieldX className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <div>
              <h2 className="text-3xl font-bold text-red-600">
                Invitado Rechazado
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {invitado.nombre} {invitado.apellido}
              </p>

              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Razón:</p>
                <p className="text-lg font-semibold text-red-600">
                  {invitado.razon_rechazo && getRazonLabel(invitado.razon_rechazo)}
                </p>
                {invitado.razon_rechazo === 'otro' && invitado.razon_rechazo_detalle && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {invitado.razon_rechazo_detalle}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={onNuevoEscaneo}
              size="lg"
              className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white text-lg py-6"
            >
              Continuar Escaneando
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
