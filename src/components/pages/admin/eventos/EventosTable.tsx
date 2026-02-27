import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  Image as ImageIcon,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react'
import type { Evento } from '@/types/database'
import type { MesaEventoStats } from './useEventosData'

interface EventosTableProps {
  eventos: Evento[]
  mesaStats: Record<string, MesaEventoStats>
  onOpenLotesDialog: (evento: Evento) => void
  onToggleEstado: (evento: Evento) => void
  onEdit: (evento: Evento) => void
  onDelete: (evento: Evento) => void
  formatFecha: (fecha: string, tipo?: 'completo' | 'card') => string
}

export function EventosTable({
  eventos,
  mesaStats,
  onOpenLotesDialog,
  onToggleEstado,
  onEdit,
  onDelete,
  formatFecha,
}: EventosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Banner</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Invitados</TableHead>
          <TableHead>Ingresados</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eventos.map((evento) => (
          <TableRow key={evento.id}>
            <TableCell>
              <div className="w-20 h-12 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {evento.banner_url ? (
                  <img
                    src={evento.banner_url}
                    alt={evento.nombre}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium">
              {evento.nombre}
            </TableCell>
            <TableCell>{formatFecha(evento.fecha)}</TableCell>
            <TableCell>
              {(() => {
                const mesas = mesaStats[evento.id]
                const totalInvitados = evento.total_invitados + (mesas?.capacidad ?? 0)
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {totalInvitados}
                    </div>
                    {mesas && mesas.capacidad > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UtensilsCrossed className="h-3 w-3" />
                        {evento.total_invitados} inv + {mesas.capacidad} mesas
                      </div>
                    )}
                  </div>
                )
              })()}
            </TableCell>
            <TableCell>
              {(() => {
                const mesas = mesaStats[evento.id]
                const totalIngresados = evento.total_ingresados + (mesas?.scans ?? 0)
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      {totalIngresados}
                    </div>
                    {mesas && mesas.scans > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UtensilsCrossed className="h-3 w-3" />
                        {evento.total_ingresados} inv + {mesas.scans} mesas
                      </div>
                    )}
                  </div>
                )
              })()}
            </TableCell>
            <TableCell>
              <Badge
                variant={evento.estado ? 'default' : 'secondary'}
                className={
                  evento.estado
                    ? 'bg-green-500'
                    : 'bg-gray-500'
                }
              >
                {evento.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenLotesDialog(evento)}
                  title="Gestionar lotes"
                >
                  <Ticket className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleEstado(evento)}
                  title={
                    evento.estado
                      ? 'Desactivar evento'
                      : 'Activar evento'
                  }
                >
                  {evento.estado ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(evento)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(evento)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
