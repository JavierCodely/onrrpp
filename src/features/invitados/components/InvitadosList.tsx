import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { InvitadosFilters } from './InvitadosFilters'
import { InvitadosTable } from './InvitadosTable'
import { InvitadosMobileList } from './InvitadosMobileList'
import type { InvitadoConLote } from '@/services/invitados.service'
import type { Lote } from '@/types/database'

interface InvitadosListProps {
  invitados: InvitadoConLote[]
  filteredInvitados: InvitadoConLote[]
  lotes: Lote[]
  loading: boolean
  searchNombre: string
  onSearchNombreChange: (value: string) => void
  filterEstado: 'ALL' | 'ingresados' | 'pendientes'
  onFilterEstadoChange: (value: 'ALL' | 'ingresados' | 'pendientes') => void
  filterLote: string
  onFilterLoteChange: (value: string) => void
  onCreateInvitado: () => void
  onEditInvitado: (invitado: InvitadoConLote) => void
  onShowQR: (invitado: InvitadoConLote) => void
  onDeleteInvitado?: (invitado: InvitadoConLote) => void
  deleting?: string | null
}

export function InvitadosList({
  invitados,
  filteredInvitados,
  lotes,
  loading,
  searchNombre,
  onSearchNombreChange,
  filterEstado,
  onFilterEstadoChange,
  filterLote,
  onFilterLoteChange,
  onCreateInvitado,
  onEditInvitado,
  onShowQR,
  onDeleteInvitado,
  deleting,
}: InvitadosListProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Lista de Entradas</CardTitle>
            <CardDescription>
              {filteredInvitados.length} de {invitados.length} entradas
            </CardDescription>
          </div>
          <Button onClick={onCreateInvitado} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Entrada
          </Button>
        </div>

        <div className="mt-4">
          <InvitadosFilters
            searchNombre={searchNombre}
            onSearchNombreChange={onSearchNombreChange}
            filterEstado={filterEstado}
            onFilterEstadoChange={onFilterEstadoChange}
            filterLote={filterLote}
            onFilterLoteChange={onFilterLoteChange}
            lotes={lotes}
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando entradas...
          </div>
        ) : filteredInvitados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {invitados.length === 0
                ? 'No hay entradas registradas'
                : 'No se encontraron entradas con los filtros aplicados'}
            </p>
            {invitados.length === 0 && (
              <Button
                onClick={onCreateInvitado}
                variant="outline"
                className="mt-4"
              >
                Agregar primera entrada
              </Button>
            )}
          </div>
        ) : (
          <>
            <InvitadosTable
              invitados={filteredInvitados}
              onEdit={onEditInvitado}
              onShowQR={onShowQR}
              onDelete={onDeleteInvitado}
              deleting={deleting}
            />
            <InvitadosMobileList
              invitados={filteredInvitados}
              onEdit={onEditInvitado}
              onShowQR={onShowQR}
              onDelete={onDeleteInvitado}
              deleting={deleting}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
