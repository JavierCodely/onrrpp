import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UtensilsCrossed } from 'lucide-react'
import type { DashboardStats } from '@/services/analytics.service'

interface MesasKPICardsProps {
  loading: boolean
  stats: DashboardStats
}

export function MesasKPICards({ loading, stats }: MesasKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mesas Totales</CardTitle>
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : stats.total_mesas}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.total_mesas_vendidas} vendidas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mesas Vendidas</CardTitle>
          <UtensilsCrossed className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '-' : stats.total_mesas_vendidas}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.total_mesas > 0
              ? `${((stats.total_mesas_vendidas / stats.total_mesas) * 100).toFixed(0)}% del total`
              : 'Sin datos'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresados por Mesa</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {loading ? '-' : stats.total_ingresados_mesas}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.capacidad_total_mesas > 0
              ? `${((stats.total_ingresados_mesas / stats.capacidad_total_mesas) * 100).toFixed(1)}% de capacidad`
              : 'Sin datos'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Capacidad Mesas</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {loading ? '-' : stats.capacidad_total_mesas}
          </div>
          <p className="text-xs text-muted-foreground">
            Personas máximo (mesas vendidas)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
