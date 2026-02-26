import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  Calendar,
  Ticket,
} from 'lucide-react'
import type { Evento } from '@/types/database'

interface EventosCardsProps {
  eventos: Evento[]
  onOpenLotesDialog: (evento: Evento) => void
  onToggleEstado: (evento: Evento) => void
  onEdit: (evento: Evento) => void
  onDelete: (evento: Evento) => void
  formatFecha: (fecha: string, tipo?: 'completo' | 'card') => string
  formatHora: (fecha: string) => string
}

export function EventosCards({
  eventos,
  onOpenLotesDialog,
  onToggleEstado,
  onEdit,
  onDelete,
  formatFecha,
  formatHora,
}: EventosCardsProps) {
  return (
    <div className="space-y-4">
      {eventos.map((evento) => (
        <Card key={evento.id}>
          <CardContent className="p-4">
            {/* Banner */}
            {evento.banner_url && (
              <div className="w-full aspect-[2/1] rounded-lg overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
                <img
                  src={evento.banner_url}
                  alt={evento.nombre}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg">{evento.nombre}</h3>
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
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {formatFecha(evento.fecha, 'card')}
                </div>
                <div className="text-xs text-muted-foreground ml-6">
                  {formatHora(evento.fecha)} hs
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{evento.total_invitados} invitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span>{evento.total_ingresados} ingresados</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenLotesDialog(evento)}
                  className="flex-1"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Lotes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleEstado(evento)}
                  className="flex-1"
                >
                  {evento.estado ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Activar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(evento)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(evento)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
