import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Lote } from '@/types/database'
import type { SeguridadLoteAsignado } from '@/services/lotes-seguridad.service'

interface SeguridadAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLote: Lote | null
  loadingSeguridad: boolean
  seguridadList: Array<{ id: string; nombre: string; apellido: string; activo: boolean }>
  loteAssignments: SeguridadLoteAsignado[]
  isSeguridadAssigned: (idSeguridad: string) => boolean
  onAssignSeguridad: (idSeguridad: string) => void
  onRemoveSeguridad: (assignmentId: string) => void
  onClose: () => void
}

export function SeguridadAssignmentDialog({
  open,
  onOpenChange,
  selectedLote,
  loadingSeguridad,
  seguridadList,
  loteAssignments,
  isSeguridadAssigned,
  onAssignSeguridad,
  onRemoveSeguridad,
  onClose,
}: SeguridadAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Asignar Seguridad - {selectedLote?.nombre}
          </DialogTitle>
          <DialogDescription>
            Solo el personal de seguridad asignado podrá escanear QR de este lote
          </DialogDescription>
        </DialogHeader>

        {loadingSeguridad ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Seguridad asignados */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Seguridad Asignados ({loteAssignments.length})
              </h4>
              {loteAssignments.length === 0 ? (
                <div className="text-center py-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <ShieldCheck className="mx-auto h-8 w-8 text-amber-500 opacity-50" />
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    Sin seguridad asignado
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Cualquier seguridad podrá escanear este lote
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {loteAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">
                          {assignment.seguridad_nombre} {assignment.seguridad_apellido}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSeguridad(assignment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de seguridad disponible para asignar */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Personal de Seguridad Disponible
              </h4>
              {seguridadList.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2 text-sm">No hay personal de seguridad registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {seguridadList
                    .filter(s => s.activo)
                    .map((seguridad) => {
                      const isAssigned = isSeguridadAssigned(seguridad.id)
                      return (
                        <div
                          key={seguridad.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isAssigned
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isAssigned ? 'bg-gray-400' : 'bg-blue-500'
                            }`}>
                              <Shield className="h-4 w-4 text-white" />
                            </div>
                            <span className={isAssigned ? 'text-muted-foreground' : ''}>
                              {seguridad.nombre} {seguridad.apellido}
                            </span>
                          </div>
                          {isAssigned ? (
                            <Badge variant="secondary" className="gap-1">
                              <UserCheck className="h-3 w-3" />
                              Asignado
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAssignSeguridad(seguridad.id)}
                              className="gap-1"
                            >
                              <UserPlus className="h-4 w-4" />
                              Asignar
                            </Button>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
