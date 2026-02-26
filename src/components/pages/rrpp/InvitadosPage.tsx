import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { invitadosService } from '@/services/invitados.service'
import {
  EventoCard,
  InvitadosList,
  InvitadoFormDialog,
  QRDialog,
  LoteSelectionDialog,
} from '@/features/invitados/components'
import {
  useEventosRRPP,
  useInvitadosRRPP,
  useLotesRRPP,
  useInvitadosFilter,
} from '@/features/invitados/hooks'
import type { InvitadoConLote } from '@/services/invitados.service'
import type { Lote } from '@/types/database'

export function InvitadosPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // Estado de selección
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [selectedInvitado, setSelectedInvitado] = useState<InvitadoConLote | null>(null)
  const [pendingLoteId, setPendingLoteId] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<string | null>(null)

  // Estados de modales
  const [dialogOpen, setDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false)
  const [dialogPreselectedLoteId, setDialogPreselectedLoteId] = useState<string | undefined>(undefined)

  // Custom hooks
  const { eventos, loading: loadingEventos } = useEventosRRPP()
  const { invitados, loading: loadingInvitados, loadInvitados } = useInvitadosRRPP(selectedEvento)
  const { lotes, lotesDisponiblesParaCrear, loadLotes } = useLotesRRPP(
    selectedEvento,
    selectedInvitado?.uuid_lote
  )
  const {
    searchNombre,
    setSearchNombre,
    filterLote,
    setFilterLote,
    filterEstado,
    setFilterEstado,
    filteredInvitados,
    resetFilters,
  } = useInvitadosFilter(invitados)

  // Manejar parámetros de URL (eventoId y loteId preseleccionados)
  useEffect(() => {
    const eventoId = searchParams.get('eventoId')
    const loteId = searchParams.get('loteId')

    if (eventoId) {
      setSelectedEvento(eventoId)
      if (loteId) {
        setPendingLoteId(loteId)
      }
      // Limpiar los parámetros de la URL
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Abrir modal después de que se carguen los lotes (cuando viene de eventos con lote preseleccionado)
  useEffect(() => {
    if (pendingLoteId && lotes.length > 0) {
      handleOpenDialog(undefined, pendingLoteId)
      setPendingLoteId(null)
    }
  }, [lotes, pendingLoteId])

  const handleEventoClick = (eventoId: string) => {
    if (selectedEvento === eventoId) {
      // Si el mismo evento está seleccionado, deseleccionarlo (colapsar)
      setSelectedEvento('')
    } else {
      // Seleccionar nuevo evento
      setSelectedEvento(eventoId)
      resetFilters()
    }
  }

  // Abrir modal de selección de lotes (para crear nuevo invitado)
  const handleOpenLotesDialog = async () => {
    await loadLotes()
    setLotesDialogOpen(true)
  }

  // Seleccionar un lote y abrir el formulario de invitado
  const handleSelectLote = (lote: Lote) => {
    setLotesDialogOpen(false)
    handleOpenDialog(undefined, lote.id)
  }

  const handleOpenDialog = async (invitado?: InvitadoConLote, preselectedLoteId?: string) => {
    // Guardar el lote preseleccionado PRIMERO (antes de cualquier async)
    setDialogPreselectedLoteId(preselectedLoteId)
    setSelectedInvitado(invitado || null)

    // Recargar lotes disponibles para obtener la lista actualizada
    await loadLotes()

    // Abrir el modal después de cargar los lotes
    setDialogOpen(true)
  }

  const handleShowQR = async (invitado: InvitadoConLote) => {
    if (!user) return

    // Verificar si el usuario está activo antes de mostrar el QR
    const { isActive, error } = await authService.checkUserActive(user.id)

    if (error) {
      toast.error('Error al verificar estado del usuario', {
        description: error.message,
      })
      return
    }

    if (!isActive) {
      toast.error('Usuario inactivo', {
        description: 'Tu cuenta ha sido desactivada. Contacta con un administrador.',
      })

      // Cerrar sesión con razón (sin recargar)
      await useAuthStore.getState().signOut('Tu cuenta ha sido deshabilitada, contacta con un administrador')
      return
    }

    // Si el usuario está activo, mostrar el QR
    setSelectedInvitado(invitado)
    setQrDialogOpen(true)
  }

  const handleCloseQR = () => {
    setQrDialogOpen(false)
    setSelectedInvitado(null)
  }

  const handleDeleteInvitado = async (invitado: InvitadoConLote) => {
    setDeleting(invitado.id)
    try {
      const { error } = await invitadosService.deleteInvitado(invitado.id)
      if (error) {
        if (error.message.includes('ya ingresó')) {
          toast.error('No se puede eliminar', {
            description: 'Este invitado ya ingresó al evento',
          })
        } else {
          toast.error('Error al eliminar', { description: error.message })
        }
      } else {
        toast.success('Entrada eliminada', {
          description: `Se eliminó la entrada de ${invitado.nombre} ${invitado.apellido}. El QR ya no será válido.`,
        })
        loadInvitados()
        loadLotes()
      }
    } catch (err) {
      toast.error('Error al eliminar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Entradas</h1>
          <p className="text-muted-foreground">
            Selecciona un evento para gestionar tus entradas
          </p>
        </div>
      </div>

      {/* Grid de eventos con banners */}
      {loadingEventos ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay eventos activos disponibles. Contacta con un administrador.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {eventos.map((evento) => {
            const isExpanded = selectedEvento === evento.id

            return (
              <div key={evento.id}>
                <EventoCard
                  evento={evento}
                  isExpanded={isExpanded}
                  onToggle={handleEventoClick}
                />

                {/* Sección de invitados expandida */}
                {isExpanded && (
                  <InvitadosList
                    invitados={invitados}
                    filteredInvitados={filteredInvitados}
                    lotes={lotes}
                    loading={loadingInvitados}
                    searchNombre={searchNombre}
                    onSearchNombreChange={setSearchNombre}
                    filterEstado={filterEstado}
                    onFilterEstadoChange={setFilterEstado}
                    filterLote={filterLote}
                    onFilterLoteChange={setFilterLote}
                    onCreateInvitado={handleOpenLotesDialog}
                    onEditInvitado={handleOpenDialog}
                    onShowQR={handleShowQR}
                    onDeleteInvitado={handleDeleteInvitado}
                    deleting={deleting}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear/Editar Invitado */}
      <InvitadoFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          // Limpiar el lote preseleccionado cuando se cierra el modal
          if (!open) {
            setDialogPreselectedLoteId(undefined)
          }
        }}
        selectedInvitado={selectedInvitado}
        selectedEvento={selectedEvento}
        eventoData={eventos.find(e => e.id === selectedEvento)}
        lotes={lotes}
        lotesDisponibles={lotesDisponiblesParaCrear}
        preselectedLoteId={dialogPreselectedLoteId || (filterLote !== 'ALL' ? filterLote : undefined)}
        onSuccess={() => {
          loadInvitados()
          loadLotes()
        }}
        onShowQR={handleShowQR}
        loadInvitados={loadInvitados}
        loadLotes={loadLotes}
      />

      {/* Modal QR */}
      <QRDialog
        open={qrDialogOpen}
        onOpenChange={handleCloseQR}
        invitado={selectedInvitado}
        clubNombre={user?.club.nombre}
      />

      {/* Modal Selección de Lotes (compartido con Eventos) */}
      <LoteSelectionDialog
        open={lotesDialogOpen}
        onOpenChange={setLotesDialogOpen}
        lotes={lotesDisponiblesParaCrear}
        onSelectLote={handleSelectLote}
      />
    </div>
  )
}
