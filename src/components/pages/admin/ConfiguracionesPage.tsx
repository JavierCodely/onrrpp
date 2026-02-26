import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export function ConfiguracionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuraciones</h1>
        <p className="text-muted-foreground">
          Configuración del sistema y preferencias
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900/20 flex items-center justify-center">
            <Construction className="w-8 h-8 text-slate-600 dark:text-slate-400" />
          </div>
          <CardTitle className="text-2xl">En Desarrollo</CardTitle>
          <CardDescription className="text-base">
            Esta sección estará disponible próximamente
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            Aquí podrás configurar las preferencias del club, notificaciones y más.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
