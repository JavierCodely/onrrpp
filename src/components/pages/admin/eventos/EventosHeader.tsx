import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface EventosHeaderProps {
  onCreateEvento: () => void
}

export function EventosHeader({ onCreateEvento }: EventosHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground">
          Gestiona los eventos de tu club
        </p>
      </div>
      <Button onClick={onCreateEvento} className="gap-2">
        <Plus className="h-4 w-4" />
        Nuevo Evento
      </Button>
    </div>
  )
}
