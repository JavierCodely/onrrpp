import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export function EmptyEventState() {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Selecciona un evento</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Para ver las estadísticas y gráficos del dashboard, primero debes seleccionar un evento en el filtro de arriba.
        </p>
      </CardContent>
    </Card>
  )
}
