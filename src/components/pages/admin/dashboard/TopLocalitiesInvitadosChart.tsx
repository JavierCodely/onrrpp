import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { LocationStats, RRPPLocalidadStats } from '@/services/analytics.service'

interface TopLocalitiesInvitadosChartProps {
  loading: boolean
  topLocalidadesInvitados: LocationStats[]
  selectedLocalidad: LocationStats | null
  rrppsByLocalidad: RRPPLocalidadStats[]
  onLocalidadClick: (localidad: LocationStats) => Promise<void>
  onClearSelection: () => void
}

export function TopLocalitiesInvitadosChart({
  loading,
  topLocalidadesInvitados,
  selectedLocalidad,
  rrppsByLocalidad,
  onLocalidadClick,
  onClearSelection,
}: TopLocalitiesInvitadosChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <CardTitle>TOP 5 Localidades - Invitados</CardTitle>
        </div>
        <CardDescription>
          Haz clic en una barra para ver el desglose por RRPP
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : topLocalidadesInvitados.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos de localidades
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topLocalidadesInvitados}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    onLocalidadClick(data.activePayload[0].payload)
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
                  fill="#8b5cf6"
                  name="Invitados"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>

            {selectedLocalidad && rrppsByLocalidad.length > 0 && (
              <Card className="border-2 border-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Desglose - {selectedLocalidad.ubicacion}
                  </CardTitle>
                  <CardDescription>
                    RRPPs que invitaron personas de esta localidad ({selectedLocalidad.cantidad} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rrppsByLocalidad.map((rrpp) => (
                      <div
                        key={rrpp.id_rrpp}
                        className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">{rrpp.nombre_rrpp}</span>
                        </div>
                        <Badge variant="secondary" className="bg-purple-600 text-white">
                          {rrpp.cantidad} {rrpp.cantidad === 1 ? 'invitado' : 'invitados'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
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
