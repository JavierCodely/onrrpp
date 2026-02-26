import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Pencil, QrCode, Crown, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { InvitadoConLote } from '@/services/invitados.service'

interface InvitadosMobileListProps {
  invitados: InvitadoConLote[]
  onEdit: (invitado: InvitadoConLote) => void
  onShowQR: (invitado: InvitadoConLote) => void
  onDelete?: (invitado: InvitadoConLote) => void
  deleting?: string | null
}

export function InvitadosMobileList({ invitados, onEdit, onShowQR, onDelete, deleting }: InvitadosMobileListProps) {
  return (
    <div className="md:hidden space-y-4">
      {invitados.map((invitado) => (
        <Card key={invitado.id}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {invitado.nombre} {invitado.apellido}
                  </h3>
                  {(invitado.departamento || invitado.localidad) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {invitado.localidad && invitado.departamento
                        ? `${invitado.localidad}, ${invitado.departamento}`
                        : invitado.localidad || invitado.departamento}
                    </div>
                  )}
                  {invitado.lote && (
                    <div className="flex items-center gap-2 mt-1">
                      {invitado.lote.es_vip && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="text-sm">{invitado.lote.nombre}</span>
                    </div>
                  )}
                </div>
                <Badge
                  variant={invitado.ingresado ? 'default' : 'secondary'}
                  className={
                    invitado.ingresado
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }
                >
                  {invitado.ingresado ? 'Ingresado' : 'Pendiente'}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                {!invitado.ingresado && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(invitado)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowQR(invitado)}
                  className="flex-1"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Ver QR
                </Button>
                {!invitado.ingresado && onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                        disabled={deleting === invitado.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar entrada</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <span className="block">
                            Se eliminará la entrada y la venta de <strong>{invitado.nombre} {invitado.apellido}</strong>.
                          </span>
                          <span className="block font-semibold text-destructive">
                            El cliente NO podrá ingresar con ese QR. Esta acción no se puede deshacer.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(invitado)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
