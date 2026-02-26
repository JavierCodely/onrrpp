import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck } from 'lucide-react'
import type { DashboardStats } from '@/services/analytics.service'

interface AverageAgeCardProps {
  loading: boolean
  stats: DashboardStats | null
}

export function AverageAgeCard({ loading, stats }: AverageAgeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promedio de Edad</CardTitle>
        <CardDescription>
          Edad promedio de invitados e ingresados por género
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Primera fila: Promedio de TODOS los invitados */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Invitados Registrados</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mujeres</CardTitle>
                  <Users className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600">
                    {loading ? '-' : stats?.promedio_edad_mujeres || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hombres</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {loading ? '-' : stats?.promedio_edad_hombres || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">General</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {loading ? '-' : stats?.promedio_edad_general || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Segunda fila: Promedio de INGRESADOS */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Ingresados al Evento</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-pink-300 bg-pink-100 dark:bg-pink-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mujeres</CardTitle>
                  <UserCheck className="h-4 w-4 text-pink-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-700">
                    {loading ? '-' : stats?.promedio_edad_ingresados_mujeres || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-300 bg-blue-100 dark:bg-blue-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hombres</CardTitle>
                  <UserCheck className="h-4 w-4 text-blue-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {loading ? '-' : stats?.promedio_edad_ingresados_hombres || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-300 bg-purple-100 dark:bg-purple-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">General</CardTitle>
                  <UserCheck className="h-4 w-4 text-purple-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700">
                    {loading ? '-' : stats?.promedio_edad_ingresados_general || 0} años
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promedio de edad
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
