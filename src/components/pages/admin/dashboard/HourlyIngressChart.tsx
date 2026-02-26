import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { HourlyIngresos } from '@/services/analytics.service'

interface HourlyIngressChartProps {
  loading: boolean
  hourlyData: HourlyIngresos[]
}

export function HourlyIngressChart({ loading, hourlyData }: HourlyIngressChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Ingresos por Hora</CardTitle>
        </div>
        <CardDescription>
          Distribución de ingresos a lo largo del día
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : hourlyData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de ingresos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cantidad" fill="#3b82f6" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
