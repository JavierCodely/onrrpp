import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Eye, UtensilsCrossed, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { VentaMesaResult } from '@/types/database'

interface MesaConfirmationModalProps {
  mesaResult: VentaMesaResult
  isProcessingAction: boolean
  onConfirmMesaIngreso: () => void
  onShowMesaLocation: () => void
  onNuevoEscaneo: () => void
}

export function MesaConfirmationModal({
  mesaResult,
  isProcessingAction,
  onConfirmMesaIngreso,
  onShowMesaLocation,
  onNuevoEscaneo,
}: MesaConfirmationModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4 border-purple-500 border-2 relative">
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
            <div className="w-24 h-24 rounded-full bg-purple-500 flex items-center justify-center">
              <UtensilsCrossed className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-purple-600">Mesa Detectada</h2>

            <div className="space-y-2">
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {mesaResult.mesa_nombre}
              </p>
              <p className="text-lg text-muted-foreground">
                {mesaResult.sector_nombre}
              </p>
            </div>

            {mesaResult.cliente_nombre && (
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{mesaResult.cliente_nombre}</p>
                {mesaResult.cliente_dni && (
                  <p className="text-sm text-muted-foreground">DNI: {mesaResult.cliente_dni}</p>
                )}
              </div>
            )}

            {mesaResult.max_personas && (
              <p className="text-sm text-muted-foreground">
                Ingresos: {mesaResult.escaneos_actuales || 0} / {mesaResult.max_personas}
              </p>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={onConfirmMesaIngreso}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                disabled={isProcessingAction}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Ingresar
              </Button>
              {mesaResult.sector_imagen_url && (
                <Button
                  onClick={onShowMesaLocation}
                  size="lg"
                  variant="outline"
                  className="w-full text-lg py-6"
                  disabled={isProcessingAction}
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Ver Ubicación
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
