import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, UserCheck, Filter } from 'lucide-react'
import type { Lote } from '@/types/database'

interface InvitadosFiltersProps {
  searchNombre: string
  onSearchNombreChange: (value: string) => void
  filterEstado: 'ALL' | 'ingresados' | 'pendientes'
  onFilterEstadoChange: (value: 'ALL' | 'ingresados' | 'pendientes') => void
  filterLote: string
  onFilterLoteChange: (value: string) => void
  lotes: Lote[]
}

export function InvitadosFilters({
  searchNombre,
  onSearchNombreChange,
  filterEstado,
  onFilterEstadoChange,
  filterLote,
  onFilterLoteChange,
  lotes,
}: InvitadosFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="search-invitados"
          name="search-invitados"
          placeholder="Buscar por nombre..."
          value={searchNombre}
          onChange={(e) => onSearchNombreChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select value={filterEstado} onValueChange={onFilterEstadoChange}>
          <SelectTrigger id="filter-estado">
            <UserCheck className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ingresados">✓ Ingresados</SelectItem>
            <SelectItem value="pendientes">⏱ Pendientes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLote} onValueChange={onFilterLoteChange}>
          <SelectTrigger id="filter-lote">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los lotes</SelectItem>
            {lotes.map((lote) => (
              <SelectItem key={lote.id} value={lote.id}>
                {lote.es_vip && '👑 '}
                {lote.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
