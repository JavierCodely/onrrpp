import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Lote } from '@/types/database'

interface LoteDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLote: Lote | null
  onConfirm: () => void
  onCancel: () => void
}

export function LoteDeleteDialog({
  open,
  onOpenChange,
  selectedLote,
  onConfirm,
  onCancel,
}: LoteDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el lote "{selectedLote?.nombre}". Los invitados asociados
            a este lote quedarán sin lote asignado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
