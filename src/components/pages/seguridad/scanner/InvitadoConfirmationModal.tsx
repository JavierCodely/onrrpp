import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Crown, MapPin, ShieldX, Ticket, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles } from '@/types/database'
import { getRazonLabel } from './scanner.utils'

interface InvitadoConfirmationModalProps {
  invitado: InvitadoConDetalles
  isProcessingAction: boolean
  onConfirmIngreso: () => void
  onShowRejectOptions: () => void
  onNuevoEscaneo: () => void
}

export function InvitadoConfirmationModal({
  invitado,
  isProcessingAction,
  onConfirmIngreso,
  onShowRejectOptions,
  onNuevoEscaneo,
}: InvitadoConfirmationModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4 border-blue-500 border-2 relative">
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
          {/* Foto de perfil (solo VIP) */}
          {invitado.lote?.es_vip && invitado.profile_image_url && (
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
                <img
                  src={invitado.profile_image_url}
                  alt={`${invitado.nombre} ${invitado.apellido}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="space-y-4 text-center">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">
                Confirmar Acción
              </h2>
            </div>

            {/* Alerta si fue rechazado anteriormente */}
            {invitado.rechazado && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Este invitado fue rechazado anteriormente
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Razón: {invitado.razon_rechazo && getRazonLabel(invitado.razon_rechazo)}
                  {invitado.razon_rechazo === 'otro' && invitado.razon_rechazo_detalle && (
                    <> - {invitado.razon_rechazo_detalle}</>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-4xl font-black text-gray-900 dark:text-white">
                {invitado.dni}
              </p>

              <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                {invitado.nombre} {invitado.apellido}
              </p>

              {invitado.edad && (
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  {invitado.edad} años
                </p>
              )}

              <p className="text-sm text-muted-foreground pt-2">
                Entrada generada por: {invitado.rrpp.nombre} {invitado.rrpp.apellido}
              </p>

              {invitado.lote && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {invitado.lote.es_vip ? (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1">
                      <Crown className="h-3 w-3" />
                      VIP - {invitado.lote.nombre}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Ticket className="h-3 w-3" />
                      {invitado.lote.nombre}
                    </Badge>
                  )}
                </div>
              )}

              {(invitado.departamento || invitado.localidad) && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {invitado.localidad && invitado.departamento
                      ? `${invitado.localidad}, ${invitado.departamento}`
                      : invitado.localidad || invitado.departamento}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={onConfirmIngreso}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                disabled={isProcessingAction}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Ingresar
              </Button>
              <Button
                onClick={onShowRejectOptions}
                size="lg"
                variant="destructive"
                className="w-full text-lg py-6"
                disabled={isProcessingAction}
              >
                <ShieldX className="h-5 w-5 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
