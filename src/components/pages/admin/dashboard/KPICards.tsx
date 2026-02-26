import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, TrendingUp } from 'lucide-react'
import type { DashboardStats } from '@/services/analytics.service'

interface KPICardsProps {
  loading: boolean
  stats: DashboardStats | null
}

export function KPICards({ loading, stats }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invitados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : ((stats?.total_invitados || 0) + (stats?.capacidad_total_mesas || 0)).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats && stats.capacidad_total_mesas > 0
              ? `${stats.total_invitados.toLocaleString()} invitados + ${stats.capacidad_total_mesas.toLocaleString()} mesas`
              : 'Todos los invitados registrados'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ingresados</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {loading ? '-' : ((stats?.total_ingresados || 0) + (stats?.total_ingresados_mesas || 0)).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats && stats.total_ingresados_mesas > 0
              ? `${stats.total_ingresados.toLocaleString()} invitados + ${stats.total_ingresados_mesas.toLocaleString()} mesas`
              : (() => {
                  const totalCombinado = (stats?.total_invitados || 0) + (stats?.capacidad_total_mesas || 0)
                  return totalCombinado > 0
                    ? `${(((stats?.total_ingresados || 0) / totalCombinado) * 100).toFixed(1)}% del total`
                    : 'Sin datos'
                })()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Ingreso</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {(() => {
              if (loading || !stats) return '-'
              const totalInvitados = stats.total_invitados + stats.capacidad_total_mesas
              const totalIngresados = stats.total_ingresados + stats.total_ingresados_mesas
              return totalInvitados > 0
                ? `${((totalIngresados / totalInvitados) * 100).toFixed(1)}%`
                : '-'
            })()}
          </div>
          <p className="text-xs text-muted-foreground">
            Porcentaje de invitados que ingresaron
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
