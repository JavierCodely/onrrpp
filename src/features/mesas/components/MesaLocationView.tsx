import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

interface MesaLocationViewProps {
  sectorImagenUrl: string
  mesaNombre: string
  sectorNombre: string
  coordenadaX: number
  coordenadaY: number
  onClose: () => void
}

export function MesaLocationView({
  sectorImagenUrl,
  mesaNombre,
  sectorNombre,
  coordenadaX,
  coordenadaY,
  onClose,
}: MesaLocationViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md mx-4 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-xl font-bold text-white">{mesaNombre}</h2>
            <p className="text-sm text-gray-300">{sectorNombre}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden border-2 border-white/20">
          <img
            src={sectorImagenUrl}
            alt={sectorNombre}
            className="w-full h-full object-cover"
          />
          {/* Pulsing dot at mesa position */}
          <div
            className="absolute"
            style={{
              left: `${coordenadaX}%`,
              top: `${coordenadaY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          size="lg"
          className="w-full bg-white/20 hover:bg-white/30 text-white text-lg py-6"
        >
          Cerrar
        </Button>
      </div>
    </motion.div>
  )
}
