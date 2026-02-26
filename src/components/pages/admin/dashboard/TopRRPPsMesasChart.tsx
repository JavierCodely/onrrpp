import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UtensilsCrossed, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { RRPPMesaStats } from '@/services/analytics.service'

interface TopRRPPsMesasChartProps {
  loading: boolean
  rrppMesaData: RRPPMesaStats[]
  selectedRRPPMesa: RRPPMesaStats | null
  onRRPPMesaClick: (rrpp: RRPPMesaStats | null) => void
}

export function TopRRPPsMesasChart({
  loading,
  rrppMesaData,
  selectedRRPPMesa,
  onRRPPMesaClick,
}: TopRRPPsMesasChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          <CardTitle>Top 10 RRPPs por Mesas</CardTitle>
        </div>
        <CardDescription>
          RRPPs con más ingresados por mesas vendidas. Haz clic en una barra para ver el desglose
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={rrppMesaData}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    onRRPPMesaClick(data.activePayload[0].payload)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="nombre_rrpp"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as RRPPMesaStats
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{data.nombre_rrpp}</p>
                          <p className="text-xs text-purple-600">Mesas: {data.total_mesas}</p>
                          <p className="text-xs text-muted-foreground">Capacidad: {data.capacidad_total}</p>
                          <p className="text-xs text-green-600">Ingresados: {data.total_ingresados}</p>
                          <p className="text-xs text-blue-600">Tasa: {data.tasa_ingreso.toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar
                  dataKey="capacidad_total"
                  fill="#a78bfa"
                  name="Capacidad"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
                <Bar
                  dataKey="total_ingresados"
                  fill="#10b981"
                  name="Ingresados"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>

            {selectedRRPPMesa && (
              <Card className="border-2 border-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Desglose - {selectedRRPPMesa.nombre_rrpp}</CardTitle>
                  <CardDescription>
                    Detalle de mesas vendidas e ingresados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedRRPPMesa.total_mesas}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Mesas Vendidas</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedRRPPMesa.capacidad_total}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Capacidad Total</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-green-600">
                        {selectedRRPPMesa.total_ingresados}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Ingresados</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold text-amber-600">
                        {selectedRRPPMesa.tasa_ingreso.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Tasa de Ingreso</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRRPPMesaClick(null)}
                    className="w-full mt-4"
                  >
                    Cerrar desglose
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
