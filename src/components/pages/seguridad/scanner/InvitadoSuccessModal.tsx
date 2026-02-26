import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Crown, MapPin, Ticket, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { InvitadoConDetalles } from '@/types/database'

interface InvitadoSuccessModalProps {
  invitado: InvitadoConDetalles
  onNuevoEscaneo: () => void
}

export function InvitadoSuccessModal({ invitado, onNuevoEscaneo }: InvitadoSuccessModalProps) {
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

          {invitado.lote?.es_vip && invitado.profile_image_url && (
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl">
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
              <h2 className="text-3xl font-bold text-green-600">
                ¡Ingreso Exitoso!
              </h2>
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

            <Button
              onClick={onNuevoEscaneo}
              size="lg"
              className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
            >
              Continuar Escaneando
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
