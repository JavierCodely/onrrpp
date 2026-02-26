import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { RRPPStats } from '@/services/analytics.service'

interface TopRRPPsInvitadosChartProps {
  loading: boolean
  rrppData: RRPPStats[]
  selectedRRPP: RRPPStats | null
  onRRPPClick: (rrpp: RRPPStats | null) => void
}

export function TopRRPPsInvitadosChart({
  loading,
  rrppData,
  selectedRRPP,
  onRRPPClick,
}: TopRRPPsInvitadosChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Top 10 RRPPs por Invitados</CardTitle>
        </div>
        <CardDescription>
          Haz clic en una barra para ver el desglose por género
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : rrppData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de RRPPs
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={rrppData}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    onRRPPClick(data.activePayload[0].payload)
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
                      const data = payload[0].payload as RRPPStats
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{data.nombre_rrpp}</p>
                          <p className="text-xs text-muted-foreground">Total: {data.total_invitados}</p>
                          <p className="text-xs text-blue-600">Hombres: {data.total_hombres}</p>
                          <p className="text-xs text-pink-600">Mujeres: {data.total_mujeres}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total_invitados"
                  fill="#8b5cf6"
                  name="Total Invitados"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>

            {selectedRRPP && (
              <Card className="border-2 border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Desglose - {selectedRRPP.nombre_rrpp}</CardTitle>
                  <CardDescription>
                    Distribución de invitados por género
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedRRPP.total_invitados}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedRRPP.total_hombres}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Hombres</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        {selectedRRPP.total_invitados > 0
                          ? `${((selectedRRPP.total_hombres / selectedRRPP.total_invitados) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 dark:bg-pink-950 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-pink-600" />
                      <p className="text-2xl font-bold text-pink-600">
                        {selectedRRPP.total_mujeres}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Mujeres</p>
                      <p className="text-xs text-pink-600 mt-1 font-medium">
                        {selectedRRPP.total_invitados > 0
                          ? `${((selectedRRPP.total_mujeres / selectedRRPP.total_invitados) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRRPPClick(null)}
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
