import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles, RazonRechazoType } from '@/types/database'
import { RAZONES_RECHAZO } from './scanner.constants'

interface InvitadoRejectionModalProps {
  invitado: InvitadoConDetalles
  selectedRazon: RazonRechazoType | null
  razonDetalle: string
  isProcessingAction: boolean
  onSelectRazon: (razon: RazonRechazoType) => void
  onChangeDetalle: (detalle: string) => void
  onConfirmRechazo: () => void
  onCancelReject: () => void
  onNuevoEscaneo: () => void
}

export function InvitadoRejectionModal({
  invitado,
  selectedRazon,
  razonDetalle,
  isProcessingAction,
  onSelectRazon,
  onChangeDetalle,
  onConfirmRechazo,
  onCancelReject,
  onNuevoEscaneo,
}: InvitadoRejectionModalProps) {
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
          disabled={isProcessingAction}
        >
          <X className="h-5 w-5 text-gray-700" />
        </Button>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600">
                Razón del Rechazo
              </h2>
              <p className="text-muted-foreground mt-1">
                {invitado.nombre} {invitado.apellido}
              </p>
            </div>

            <div className="space-y-3 mt-6">
              {RAZONES_RECHAZO.map((razon) => (
                <Button
                  key={razon.value}
                  variant={selectedRazon === razon.value ? "default" : "outline"}
                  className={`w-full justify-start text-left py-4 ${
                    selectedRazon === razon.value
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : ''
                  }`}
                  onClick={() => onSelectRazon(razon.value)}
                  disabled={isProcessingAction}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {razon.label}
                </Button>
              ))}
            </div>

            {selectedRazon === 'otro' && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="razon-detalle">Especificar razón:</Label>
                <Textarea
                  id="razon-detalle"
                  placeholder="Escribe la razón del rechazo..."
                  value={razonDetalle}
                  onChange={(e) => onChangeDetalle(e.target.value)}
                  className="resize-none"
                  rows={3}
                  disabled={isProcessingAction}
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={onCancelReject}
                size="lg"
                variant="outline"
                className="flex-1"
                disabled={isProcessingAction}
              >
                Volver
              </Button>
              <Button
                onClick={onConfirmRechazo}
                size="lg"
                variant="destructive"
                className="flex-1"
                disabled={!selectedRazon || isProcessingAction}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
