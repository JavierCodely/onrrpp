import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface MesaErrorModalProps {
  mesaErrorMessage: string
  onNuevoEscaneo: () => void
}

export function MesaErrorModal({ mesaErrorMessage, onNuevoEscaneo }: MesaErrorModalProps) {
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
              <AlertCircle className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold text-red-600">Error de Mesa</h2>
            <p className="text-lg text-muted-foreground">{mesaErrorMessage}</p>

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
