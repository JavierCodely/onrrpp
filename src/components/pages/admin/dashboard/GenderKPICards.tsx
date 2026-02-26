import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck } from 'lucide-react'
import type { DashboardStats } from '@/services/analytics.service'

interface GenderKPICardsProps {
  loading: boolean
  stats: DashboardStats | null
}

export function GenderKPICards({ loading, stats }: GenderKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invitadas Mujeres</CardTitle>
          <Users className="h-4 w-4 text-pink-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-pink-500">
            {loading ? '-' : stats?.total_invitados_mujeres.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresadas Mujeres</CardTitle>
          <UserCheck className="h-4 w-4 text-pink-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-pink-600">
            {loading ? '-' : stats?.total_ingresados_mujeres.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.total_invitados_mujeres && stats.total_invitados_mujeres > 0
              ? `${((stats.total_ingresados_mujeres / stats.total_invitados_mujeres) * 100).toFixed(1)}%`
              : '-'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invitados Hombres</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">
            {loading ? '-' : stats?.total_invitados_hombres.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresados Hombres</CardTitle>
          <UserCheck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {loading ? '-' : stats?.total_ingresados_hombres.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.total_invitados_hombres && stats.total_invitados_hombres > 0
              ? `${((stats.total_ingresados_hombres / stats.total_invitados_hombres) * 100).toFixed(1)}%`
              : '-'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
