import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, MapPin, Ticket, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles } from '@/types/database'
import { getRazonLabel } from './scanner.utils'

interface InvitadoErrorModalProps {
  invitado: InvitadoConDetalles
  errorReason: 'ya_ingresado' | 'lote_desactivado' | 'lote_no_asignado' | 'ya_rechazado'
  errorMessage: string
  onNuevoEscaneo: () => void
}

export function InvitadoErrorModal({
  invitado,
  errorReason,
  errorMessage,
  onNuevoEscaneo,
}: InvitadoErrorModalProps) {
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
            <div>
              <h2 className="text-3xl font-bold text-red-600">
                {errorReason === 'lote_desactivado'
                  ? '¡Lote Desactivado!'
                  : errorReason === 'lote_no_asignado'
                  ? '¡Lote No Asignado!'
                  : errorReason === 'ya_rechazado'
                  ? '¡Invitado Rechazado!'
                  : '¡Invitado Ya Ingresado!'}
              </h2>
              {errorReason === 'lote_desactivado' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Este lote ha sido desactivado por el administrador
                </p>
              )}
              {errorReason === 'lote_no_asignado' && (
                <p className="text-sm text-muted-foreground mt-2">
                  {errorMessage || 'No tienes asignado este lote'}
                </p>
              )}
              {errorReason === 'ya_rechazado' && invitado.razon_rechazo && (
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg mt-2">
                  <p className="text-sm text-muted-foreground">Razón del rechazo:</p>
                  <p className="font-semibold text-red-600">
                    {getRazonLabel(invitado.razon_rechazo)}
                  </p>
                  {invitado.razon_rechazo === 'otro' && invitado.razon_rechazo_detalle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {invitado.razon_rechazo_detalle}
                    </p>
                  )}
                </div>
              )}
            </div>

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
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Ticket className="h-4 w-4" />
                  <span>{invitado.lote.nombre}</span>
                </div>
              )}

              {(invitado.departamento || invitado.localidad) && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {invitado.localidad && invitado.departamento
                      ? `${invitado.localidad}, ${invitado.departamento}`
                      : invitado.localidad || invitado.departamento}
                  </span>
                </div>
              )}

              {errorReason === 'ya_ingresado' && invitado.fecha_ingreso && (
                <p className="text-sm text-muted-foreground mt-4">
                  Ingresó el {new Date(invitado.fecha_ingreso).toLocaleString('es-AR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}

              {errorReason === 'ya_rechazado' && invitado.fecha_rechazo && (
                <p className="text-sm text-muted-foreground mt-4">
                  Rechazado el {new Date(invitado.fecha_rechazo).toLocaleString('es-AR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
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
