import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { RRPPIngresoStats } from '@/services/analytics.service'

interface TopRRPPsIngresosChartProps {
  loading: boolean
  rrppIngresoData: RRPPIngresoStats[]
  selectedRRPPIngreso: RRPPIngresoStats | null
  onRRPPIngresoClick: (rrpp: RRPPIngresoStats | null) => void
}

export function TopRRPPsIngresosChart({
  loading,
  rrppIngresoData,
  selectedRRPPIngreso,
  onRRPPIngresoClick,
}: TopRRPPsIngresosChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          <CardTitle>Top 10 RRPPs por Cantidad de Ingresados</CardTitle>
        </div>
        <CardDescription>
          RRPPs con mayor cantidad de invitados que ingresaron. Haz clic en una barra para ver el desglose
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : rrppIngresoData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de ingresados
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={rrppIngresoData}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    onRRPPIngresoClick(data.activePayload[0].payload)
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
                      const data = payload[0].payload as RRPPIngresoStats
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{data.nombre_rrpp}</p>
                          <p className="text-xs text-green-600">
                            Ingresados: {data.total_ingresados}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total invitados: {data.total_invitados}
                          </p>
                          <div className="mt-1 pt-1 border-t">
                            <p className="text-xs text-blue-600">Hombres: {data.ingresados_hombres}</p>
                            <p className="text-xs text-pink-600">Mujeres: {data.ingresados_mujeres}</p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total_ingresados"
                  fill="#10b981"
                  name="Total Ingresados"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>

            {selectedRRPPIngreso && (
              <Card className="border-2 border-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Desglose - {selectedRRPPIngreso.nombre_rrpp}</CardTitle>
                  <CardDescription>
                    Detalle de invitados e ingresados por género
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedRRPPIngreso.total_invitados}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total Invitados</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-600">
                          {selectedRRPPIngreso.total_ingresados}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total Ingresados</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold mb-3">Ingresados por Género</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <UserCheck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedRRPPIngreso.ingresados_hombres}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Hombres Ingresados</p>
                        </div>
                        <div className="text-center p-4 bg-pink-50 dark:bg-pink-950 rounded-lg">
                          <UserCheck className="h-8 w-8 mx-auto mb-2 text-pink-600" />
                          <p className="text-2xl font-bold text-pink-600">
                            {selectedRRPPIngreso.ingresados_mujeres}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Mujeres Ingresadas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRRPPIngresoClick(null)}
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
