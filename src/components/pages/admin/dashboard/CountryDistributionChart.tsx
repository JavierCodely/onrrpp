import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { PaisStats } from '@/services/analytics.service'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface CountryDistributionChartProps {
  loading: boolean
  paisStats: PaisStats[]
}

export function CountryDistributionChart({ loading, paisStats }: CountryDistributionChartProps) {
  const total = paisStats.reduce((sum, item) => sum + item.cantidad, 0)
  const pieData = paisStats.map(p => ({
    name: p.pais,
    value: p.cantidad,
    percentage: total > 0 ? ((p.cantidad / total) * 100).toFixed(1) : '0'
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <CardTitle>Distribución por País</CardTitle>
        </div>
        <CardDescription>
          Porcentaje de invitados por país de origen
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : paisStats.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de países
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paisStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
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
  )
}
