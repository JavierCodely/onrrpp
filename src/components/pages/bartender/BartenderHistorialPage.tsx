import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService } from '@/services/eventos.service'
import { ventasMesasService } from '@/services/ventas-mesas.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Evento, VentaMesa } from '@/types/database'

export function BartenderHistorialPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [entregas, setEntregas] = useState<VentaMesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.club.id) {
      loadEventos()
    }
  }, [user?.club.id])

  useEffect(() => {
    if (user?.id) {
      loadEntregas()
    }
  }, [user?.id, selectedEvento])

  const loadEventos = async () => {
    const { data, error } = await eventosService.getEventos()

    if (error) {
      toast.error('Error al cargar eventos', { description: error.message })
    } else {
      setEventos(data || [])
    }
  }

  const loadEntregas = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data, error } = await ventasMesasService.getHistorialEntregas(
      user.id,
      selectedEvento || undefined
    )

    if (error) {
      toast.error('Error al cargar historial', { description: error.message })
      setEntregas([])
    } else {
      setEntregas(data || [])
    }

    setLoading(false)
  }

  const eventosActivos = eventos

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Entregas</h1>
        <p className="text-muted-foreground">
          Revisa todas las consumiciones que has entregado
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Evento</CardTitle>
          <CardDescription>
            Selecciona un evento o deja vacío para ver todas tus entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEvento} onValueChange={setSelectedEvento}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los eventos</SelectItem>
              {eventosActivos.map((evento) => (
                <SelectItem key={evento.id} value={evento.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {evento.nombre} - {new Date(evento.fecha).toLocaleDateString()}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas Realizadas</CardTitle>
          <CardDescription>
            Total: {entregas.length} consumiciones entregadas
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : entregas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {selectedEvento
                  ? 'No hay entregas para este evento'
                  : 'Aún no has entregado ninguna consumición'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entregas.map((entrega) => (
                <Card key={entrega.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {entrega.nombre_cliente} {entrega.apellido_cliente}
                          </h4>
                          <Badge className="bg-green-500">Entregada</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="text-muted-foreground">DNI:</div>
                          <div className="font-medium">{entrega.dni_cliente}</div>

                          <div className="text-muted-foreground">Teléfono:</div>
                          <div className="font-medium">{entrega.telefono_cliente}</div>

                          <div className="text-muted-foreground">Personas:</div>
                          <div className="font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {entrega.cantidad_personas}
                          </div>

                          <div className="text-muted-foreground">Precio:</div>
                          <div className="font-medium">${entrega.precio_final.toFixed(2)}</div>

                          {entrega.fecha_entrega_consumicion && (
                            <>
                              <div className="text-muted-foreground">Fecha entrega:</div>
                              <div className="font-medium text-xs">
                                {new Date(entrega.fecha_entrega_consumicion).toLocaleString('es-AR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {entregas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{entregas.length}</div>
                <div className="text-xs text-muted-foreground">Total Entregas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {entregas.reduce((sum, e) => sum + e.cantidad_personas, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Personas Atendidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${entregas.reduce((sum, e) => sum + e.precio_final, 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Ventas Totales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
