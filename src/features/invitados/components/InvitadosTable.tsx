import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, UserCheck, Pencil, QrCode, Crown, Trash2 } from 'lucide-react'
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

interface InvitadosTableProps {
  invitados: InvitadoConLote[]
  onEdit: (invitado: InvitadoConLote) => void
  onShowQR: (invitado: InvitadoConLote) => void
  onDelete?: (invitado: InvitadoConLote) => void
  deleting?: string | null
}

export function InvitadosTable({ invitados, onEdit, onShowQR, onDelete, deleting }: InvitadosTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitados.map((invitado) => (
            <TableRow key={invitado.id}>
              <TableCell className="font-medium">
                {invitado.nombre} {invitado.apellido}
              </TableCell>
              <TableCell>
                {invitado.lote ? (
                  <div className="flex items-center gap-2">
                    {invitado.lote.es_vip && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                    <span className="text-sm">{invitado.lote.nombre}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Sin lote</span>
                )}
              </TableCell>
              <TableCell>
                {(invitado.departamento || invitado.localidad) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="text-sm">
                      {invitado.localidad && invitado.departamento
                        ? `${invitado.localidad}, ${invitado.departamento}`
                        : invitado.localidad || invitado.departamento}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={invitado.ingresado ? 'default' : 'secondary'}
                  className={
                    invitado.ingresado
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }
                >
                  {invitado.ingresado ? (
                    <>
                      <UserCheck className="h-3 w-3 mr-1" />
                      Ingresado
                    </>
                  ) : (
                    'Pendiente'
                  )}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {!invitado.ingresado && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(invitado)}
                      title="Editar entrada"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowQR(invitado)}
                    title="Ver código QR"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  {!invitado.ingresado && onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Eliminar entrada"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
