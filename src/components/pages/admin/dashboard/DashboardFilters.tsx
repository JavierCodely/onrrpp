import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Filter, MapPin } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { DashboardFilters as DashboardFiltersType } from '@/services/analytics.service'

interface DashboardFiltersProps {
  filters: DashboardFiltersType & { eventoId?: string | 'ALL' }
  setFilters: React.Dispatch<React.SetStateAction<DashboardFiltersType & { eventoId?: string | 'ALL' }>>
  clearFilters: () => void
  hasActiveFilters: boolean
  eventos: Array<{ id: string; nombre: string }>
  rrpps: Array<{ id: string; nombre: string; apellido: string }>
  paises: string[]
  provincias: string[]
  departamentos: string[]
  loadProvincias: (pais: string) => Promise<void>
}

export function DashboardFilters({
  filters,
  setFilters,
  clearFilters,
  hasActiveFilters,
  eventos,
  rrpps,
  paises,
  provincias,
  departamentos,
  loadProvincias,
}: DashboardFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filtros</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
        <CardDescription>
          Filtra los datos por evento, RRPP, sexo o ubicación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {/* Filtro por Evento */}
          <div className="space-y-2 min-w-0">
            <Label>Evento</Label>
            <Select
              value={filters.eventoId || ''}
              onValueChange={(value) =>
                setFilters({ ...filters, eventoId: value || undefined })
              }
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <Calendar className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue className="flex-1 min-w-0" placeholder="Selecciona un evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los eventos</SelectItem>
                {eventos.map((evento) => (
                  <SelectItem key={evento.id} value={evento.id}>
                    {evento.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por RRPP */}
          <div className="space-y-2 min-w-0">
            <Label>RRPP</Label>
            <Select
              value={filters.rrppId || 'ALL'}
              onValueChange={(value) =>
                setFilters({ ...filters, rrppId: value === 'ALL' ? undefined : value })
              }
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <Users className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue className="flex-1 min-w-0" placeholder="Todos los RRPPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los RRPPs</SelectItem>
                {rrpps.map((rrpp) => (
                  <SelectItem key={rrpp.id} value={rrpp.id}>
                    {rrpp.nombre} {rrpp.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Sexo */}
          <div className="space-y-2 min-w-0">
            <Label>Sexo</Label>
            <Select
              value={filters.sexo || 'ALL'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  sexo: value === 'ALL' ? undefined : value as 'hombre' | 'mujer'
                })
              }
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <SelectValue className="flex-1 min-w-0" placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="hombre">Hombre</SelectItem>
                <SelectItem value="mujer">Mujer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por País */}
          <div className="space-y-2 min-w-0">
            <Label>País</Label>
            <Select
              value={filters.pais || 'ALL'}
              onValueChange={(value) => {
                const newPais = value === 'ALL' ? undefined : value
                setFilters({ ...filters, pais: newPais, provincia: undefined })
                if (newPais) {
                  loadProvincias(newPais)
                }
              }}
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <MapPin className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue className="flex-1 min-w-0" placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los países</SelectItem>
                {paises.map((pais) => (
                  <SelectItem key={pais} value={pais}>
                    {pais}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Provincia */}
          <div className="space-y-2 min-w-0">
            <Label>Provincia</Label>
            <Select
              value={filters.provincia || 'ALL'}
              onValueChange={(value) =>
                setFilters({ ...filters, provincia: value === 'ALL' ? undefined : value })
              }
              disabled={!filters.pais}
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <MapPin className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue className="flex-1 min-w-0" placeholder={filters.pais ? "Todas" : "Selecciona país"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las provincias</SelectItem>
                {provincias.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Departamento */}
          <div className="space-y-2 min-w-0">
            <Label>Departamento</Label>
            <Select
              value={filters.departamento || 'ALL'}
              onValueChange={(value) =>
                setFilters({ ...filters, departamento: value === 'ALL' ? undefined : value })
              }
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden">
                <MapPin className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue className="flex-1 min-w-0" placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los departamentos</SelectItem>
                {departamentos.map((depto) => (
                  <SelectItem key={depto} value={depto}>
                    {depto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Badges de filtros activos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {filters.eventoId && (
              <Badge variant="secondary" className="max-w-full min-w-0">
                <span className="min-w-0 truncate">
                  Evento: {filters.eventoId === 'ALL' ? 'Todos los eventos' : eventos.find(e => e.id === filters.eventoId)?.nombre}
                </span>
              </Badge>
            )}
            {filters.rrppId && (
              <Badge variant="secondary" className="max-w-full min-w-0">
                <span className="min-w-0 truncate">RRPP: {rrpps.find(r => r.id === filters.rrppId)?.nombre}</span>
              </Badge>
            )}
            {filters.sexo && (
              <Badge variant="secondary">
                Sexo: {filters.sexo === 'hombre' ? 'Hombre' : 'Mujer'}
              </Badge>
            )}
            {filters.pais && (
              <Badge variant="secondary" className="max-w-full min-w-0">
                <span className="min-w-0 truncate">País: {filters.pais}</span>
              </Badge>
            )}
            {filters.provincia && (
              <Badge variant="secondary" className="max-w-full min-w-0">
                <span className="min-w-0 truncate">Provincia: {filters.provincia}</span>
              </Badge>
            )}
            {filters.departamento && (
              <Badge variant="secondary" className="max-w-full min-w-0">
                <span className="min-w-0 truncate">Departamento: {filters.departamento}</span>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
