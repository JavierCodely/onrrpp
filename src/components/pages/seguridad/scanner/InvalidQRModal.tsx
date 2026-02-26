import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

interface InvalidQRModalProps {
  onNuevoEscaneo: () => void
}

export function InvalidQRModal({ onNuevoEscaneo }: InvalidQRModalProps) {
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
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
            transition={{
              scale: { type: 'spring', stiffness: 200, damping: 15 },
              rotate: { duration: 0.5, delay: 0.2 }
            }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
              <X className="h-16 w-16 text-white stroke-[3]" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <div>
              <h2 className="text-3xl font-bold text-red-600">
                ¡QR Inválido!
              </h2>
            </div>

            <div className="space-y-2">
              <p className="text-lg text-muted-foreground">
                El código QR escaneado no corresponde a ningún invitado registrado
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, verifica que el código QR sea correcto
              </p>
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
