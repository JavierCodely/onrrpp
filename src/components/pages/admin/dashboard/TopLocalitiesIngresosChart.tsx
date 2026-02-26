import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { LocationStats, RRPPLocalidadStats } from '@/services/analytics.service'

interface TopLocalitiesIngresosChartProps {
  loading: boolean
  locationData: LocationStats[]
  selectedLocalidadIngreso: LocationStats | null
  rrppsByLocalidadIngreso: RRPPLocalidadStats[]
  onLocalidadIngresoClick: (localidad: LocationStats) => Promise<void>
  onClearIngresoSelection: () => void
}

export function TopLocalitiesIngresosChart({
  loading,
  locationData,
  selectedLocalidadIngreso,
  rrppsByLocalidadIngreso,
  onLocalidadIngresoClick,
  onClearIngresoSelection,
}: TopLocalitiesIngresosChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <CardTitle>Ingresos por Localidad</CardTitle>
        </div>
        <CardDescription>
          Top 10 localidades (ciudades) con más ingresos. Haz clic en una barra para ver el desglose por RRPP
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : locationData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de ubicación
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={locationData}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    onLocalidadIngresoClick(data.activePayload[0].payload)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="ubicacion" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="cantidad"
                  fill="#10b981"
                  name="Ingresos"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>

            {selectedLocalidadIngreso && rrppsByLocalidadIngreso.length > 0 && (
              <Card className="border-2 border-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Desglose - {selectedLocalidadIngreso.ubicacion}
                  </CardTitle>
                  <CardDescription>
                    RRPPs que hicieron ingresar personas de esta localidad ({selectedLocalidadIngreso.cantidad} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rrppsByLocalidadIngreso.map((rrpp) => (
                      <div
                        key={rrpp.id_rrpp}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">{rrpp.nombre_rrpp}</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-600 text-white">
                          {rrpp.cantidad} {rrpp.cantidad === 1 ? 'ingresado' : 'ingresados'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearIngresoSelection}
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
