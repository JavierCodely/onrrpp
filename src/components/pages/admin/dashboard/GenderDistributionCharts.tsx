import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts'
import type { DashboardStats } from '@/services/analytics.service'

interface GenderDistributionChartsProps {
  loading: boolean
  stats: DashboardStats | null
}

export function GenderDistributionCharts({ loading, stats }: GenderDistributionChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      {/* Gráfico de torta - Distribución por género */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Distribución por Género (Ingresados)</CardTitle>
          </div>
          <CardDescription>
            Porcentaje de hombres y mujeres que ingresaron
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !stats || stats.total_ingresados === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de ingresos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Mujeres',
                      value: stats.total_ingresados_mujeres,
                      percentage: stats.total_ingresados > 0
                        ? ((stats.total_ingresados_mujeres / stats.total_ingresados) * 100).toFixed(1)
                        : '0'
                    },
                    {
                      name: 'Hombres',
                      value: stats.total_ingresados_hombres,
                      percentage: stats.total_ingresados > 0
                        ? ((stats.total_ingresados_hombres / stats.total_ingresados) * 100).toFixed(1)
                        : '0'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#ec4899" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de barras comparativo - Género */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            <CardTitle>Comparativa Invitados vs Ingresados</CardTitle>
          </div>
          <CardDescription>
            Comparación por género entre invitados e ingresados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !stats ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={[
                  {
                    categoria: 'Mujeres',
                    Invitadas: stats.total_invitados_mujeres,
                    Ingresadas: stats.total_ingresados_mujeres,
                  },
                  {
                    categoria: 'Hombres',
                    Invitados: stats.total_invitados_hombres,
                    Ingresados: stats.total_ingresados_hombres,
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Invitadas" fill="#fbb6ce" name="Invitadas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Ingresadas" fill="#db2777" name="Ingresadas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Invitados" fill="#93c5fd" name="Invitados" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Ingresados" fill="#2563eb" name="Ingresados" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
