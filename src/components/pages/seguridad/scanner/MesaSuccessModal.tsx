import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Eye, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { VentaMesaResult } from '@/types/database'

interface MesaSuccessModalProps {
  mesaResult: VentaMesaResult
  onShowMesaLocation: () => void
  onNuevoEscaneo: () => void
}

export function MesaSuccessModal({
  mesaResult,
  onShowMesaLocation,
  onNuevoEscaneo,
}: MesaSuccessModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4 border-green-500 border-2 relative">
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
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold text-green-600">¡Ingreso Exitoso!</h2>
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              {mesaResult.mesa_nombre}
            </p>
            <p className="text-muted-foreground">{mesaResult.sector_nombre}</p>

            {mesaResult.cliente_nombre && (
              <p className="text-lg font-semibold">{mesaResult.cliente_nombre}</p>
            )}

            {mesaResult.max_personas && (
              <p className="text-sm text-muted-foreground">
                Ingresos: {(mesaResult.escaneos_actuales || 0)} / {mesaResult.max_personas}
              </p>
            )}

            <div className="flex flex-col gap-3 mt-6">
              {mesaResult.sector_imagen_url && (
                <Button
                  onClick={onShowMesaLocation}
                  size="lg"
                  variant="outline"
                  className="w-full text-lg py-6"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Ver Ubicación
                </Button>
              )}
              <Button
                onClick={onNuevoEscaneo}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
              >
                Continuar Escaneando
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
