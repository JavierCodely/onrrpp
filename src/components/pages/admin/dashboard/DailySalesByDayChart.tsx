import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Crown, Ticket, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailySalesDay } from '@/services/analytics.service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Separator } from '@/components/ui/separator'

interface DailySalesByDayChartProps {
  loading: boolean
  dailySalesByDay: DailySalesDay[]
}

function titleCase(s: string) {
  return s
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function dayKeyToDate(dayKey: string) {
  // dayKey = YYYY-MM-DD
  return new Date(`${dayKey}T00:00:00`)
}

export function DailySalesByDayChart({ loading, dailySalesByDay }: DailySalesByDayChartProps) {
  const [selectedDay, setSelectedDay] = useState<DailySalesDay | null>(null)

  const data = useMemo(() => dailySalesByDay, [dailySalesByDay])

  useEffect(() => {
    // Si cambian los datos (por filtros o realtime), evitar mostrar detalle desincronizado
    setSelectedDay(null)
  }, [dailySalesByDay])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <CardTitle>Ventas por día</CardTitle>
        </div>
        <CardDescription>
          Día con más ventas (entradas + lugares de mesas). Click en una barra para ver el detalle.
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Cargando datos...
          </div>
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay ventas registradas para este evento
          </div>
        ) : (
          <div className="w-full space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data}
                onClick={(e: any) => {
                  const payload = e?.activePayload?.[0]?.payload as DailySalesDay | undefined
                  if (payload) setSelectedDay(payload)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dia"
                  tickFormatter={(dayKey) => {
                    const d = dayKeyToDate(dayKey)
                    return titleCase(format(d, 'd MMM', { locale: es }))
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const p = payload[0]?.payload as DailySalesDay | undefined
                    if (!p) return null
                    const d = dayKeyToDate(label as string)
                    const fecha = titleCase(format(d, 'EEEE d MMMM yyyy', { locale: es }))
                    return (
                      <div className="rounded-md border bg-background p-3 shadow-sm">
                        <div className="text-sm font-medium">{fecha}</div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div>
                            Total: <span className="font-medium text-foreground">{p.total}</span>
                          </div>
                          <div>
                            Entradas: <span className="font-medium text-foreground">{p.entradas_total}</span> (H:{' '}
                            <span className="font-medium text-foreground">{p.entradas_hombres}</span> / M:{' '}
                            <span className="font-medium text-foreground">{p.entradas_mujeres}</span>)
                          </div>
                          <div>
                            Mesas (lugares): <span className="font-medium text-foreground">{p.mesas_lugares}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="#10b981"
                  name="Ventas (entradas + mesas)"
                  cursor="pointer"
                  isAnimationActive={false}
                  onClick={(bar: any) => {
                    const payload = (bar as any)?.payload as DailySalesDay | undefined
                    if (payload) setSelectedDay(payload)
                  }}
                />
              </BarChart>
            </ResponsiveContainer>

            <Separator />

            {selectedDay ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {titleCase(format(dayKeyToDate(selectedDay.dia), 'EEEE d MMMM yyyy', { locale: es }))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Total <span className="font-medium text-foreground">{selectedDay.total}</span>
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Ticket className="h-3.5 w-3.5" />
                        Entradas <span className="font-medium text-foreground">{selectedDay.entradas_total}</span>
                      </Badge>
                      <Badge variant="outline">
                        H <span className="font-medium text-foreground">{selectedDay.entradas_hombres}</span>
                      </Badge>
                      <Badge variant="outline">
                        M <span className="font-medium text-foreground">{selectedDay.entradas_mujeres}</span>
                      </Badge>
                      <Badge variant="outline">
                        Mesas (lugares) <span className="font-medium text-foreground">{selectedDay.mesas_lugares}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <div className="text-xs text-muted-foreground">Seleccionado</div>
                    <div className="font-medium">{selectedDay.dia}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-gradient-to-b from-emerald-50/50 to-background p-4 dark:from-emerald-950/20">
                    <div className="text-sm text-muted-foreground">Total (entradas + mesas)</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight">{selectedDay.total}</div>
                  </div>
                  <div className="rounded-xl border bg-gradient-to-b from-blue-50/50 to-background p-4 dark:from-blue-950/20">
                    <div className="text-sm text-muted-foreground">Entradas</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight">{selectedDay.entradas_total}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-background px-2 py-1 ring-1 ring-border">
                        H: <span className="font-medium text-foreground">{selectedDay.entradas_hombres}</span>
                      </span>
                      <span className="rounded-md bg-background px-2 py-1 ring-1 ring-border">
                        M: <span className="font-medium text-foreground">{selectedDay.entradas_mujeres}</span>
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-gradient-to-b from-violet-50/50 to-background p-4 dark:from-violet-950/20">
                    <div className="text-sm text-muted-foreground">Mesas (lugares)</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight">{selectedDay.mesas_lugares}</div>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Crown className="h-4 w-4" />
                    RRPP top del día
                  </div>
                  {selectedDay.top_rrpp ? (
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm">
                        <div className="font-semibold">{selectedDay.top_rrpp.nombre_rrpp}</div>
                        <div className="text-xs text-muted-foreground">
                          Entradas {selectedDay.top_rrpp.entradas} · Mesas {selectedDay.top_rrpp.mesas} · Lugares {selectedDay.top_rrpp.mesas_lugares}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="font-semibold">{selectedDay.top_rrpp.total}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">Sin ventas por RRPP</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Seleccioná una barra para ver el detalle del día.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

