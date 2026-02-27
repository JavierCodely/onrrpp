import { useEventosData } from './eventos/useEventosData'
import { EventosHeader } from './eventos/EventosHeader'
import { EventosTable } from './eventos/EventosTable'
import { EventosCards } from './eventos/EventosCards'
import { EventoFormDialog } from './eventos/EventoFormDialog'
import { EventoDeleteDialog } from './eventos/EventoDeleteDialog'
import { LotesManagementDialog } from './eventos/LotesManagementDialog'
import { LoteFormDialog } from './eventos/LoteFormDialog'
import { LoteDeleteDialog } from './eventos/LoteDeleteDialog'
import { SeguridadAssignmentDialog } from './eventos/SeguridadAssignmentDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

export function EventosPage() {
  const data = useEventosData()

  return (
    <div className="space-y-6">
      <EventosHeader onCreateEvento={() => data.handleOpenDialog()} />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            Todos los eventos de tu club
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando eventos...
            </div>
          ) : data.eventos.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                No hay eventos registrados
              </p>
              <Button
                onClick={() => data.handleOpenDialog()}
                variant="outline"
                className="mt-4"
              >
                Crear primer evento
              </Button>
            </div>
          ) : (
            <>
              {/* Vista de escritorio: Tabla */}
              <div className="hidden md:block">
                <EventosTable
                  eventos={data.eventos}
                  mesaStats={data.mesaStats}
                  onOpenLotesDialog={data.handleOpenLotesDialog}
                  onToggleEstado={data.handleToggleEstado}
                  onEdit={data.handleOpenDialog}
                  onDelete={(evento) => {
                    data.setSelectedEvento(evento)
                    data.setDeleteDialogOpen(true)
                  }}
                  formatFecha={data.formatFecha}
                />
              </div>

              {/* Vista móvil: Cards */}
              <div className="md:hidden">
                <EventosCards
                  eventos={data.eventos}
                  onOpenLotesDialog={data.handleOpenLotesDialog}
                  onToggleEstado={data.handleToggleEstado}
                  onEdit={data.handleOpenDialog}
                  onDelete={(evento) => {
                    data.setSelectedEvento(evento)
                    data.setDeleteDialogOpen(true)
                  }}
                  formatFecha={data.formatFecha}
                  formatHora={data.formatHora}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EventoFormDialog
        open={data.dialogOpen}
        onOpenChange={data.setDialogOpen}
        selectedEvento={data.selectedEvento}
        formData={data.formData}
        setFormData={data.setFormData}
        selectedFile={data.selectedFile}
        previewUrl={data.previewUrl}
        fileInputRef={data.fileInputRef}
        uploading={data.uploading}
        onFileSelect={data.handleFileSelect}
        onRemoveImage={data.handleRemoveImage}
        onSubmit={data.handleSubmit}
        onClose={data.handleCloseDialog}
      />

      <EventoDeleteDialog
        open={data.deleteDialogOpen}
        onOpenChange={data.setDeleteDialogOpen}
        selectedEvento={data.selectedEvento}
        onConfirm={data.handleDelete}
        onCancel={() => data.setSelectedEvento(null)}
      />

      <LotesManagementDialog
        open={data.lotesDialogOpen}
        onOpenChange={data.setLotesDialogOpen}
        selectedEvento={data.selectedEvento}
        lotes={data.lotes}
        onCreateLote={() => data.handleOpenLoteForm()}
        onOpenSeguridadDialog={data.handleOpenSeguridadDialog}
        onToggleLoteActivo={data.handleToggleLoteActivo}
        onEditLote={data.handleOpenLoteForm}
        onDeleteLote={(lote) => {
          data.setSelectedLote(lote)
          data.setDeleteLoteDialogOpen(true)
        }}
        onClose={data.handleCloseLotesDialog}
      />

      <LoteFormDialog
        open={data.loteFormDialogOpen}
        onOpenChange={data.setLoteFormDialogOpen}
        selectedLote={data.selectedLote}
        loteFormData={data.loteFormData}
        setLoteFormData={data.setLoteFormData}
        onSubmit={data.handleSubmitLote}
        onClose={data.handleCloseLoteForm}
      />

      <LoteDeleteDialog
        open={data.deleteLoteDialogOpen}
        onOpenChange={data.setDeleteLoteDialogOpen}
        selectedLote={data.selectedLote}
        onConfirm={data.handleDeleteLote}
        onCancel={() => data.setSelectedLote(null)}
      />

      <SeguridadAssignmentDialog
        open={data.seguridadDialogOpen}
        onOpenChange={data.setSeguridadDialogOpen}
        selectedLote={data.selectedLote}
        loadingSeguridad={data.loadingSeguridad}
        seguridadList={data.seguridadList}
        loteAssignments={data.loteAssignments}
        isSeguridadAssigned={data.isSeguridadAssigned}
        onAssignSeguridad={data.handleAssignSeguridad}
        onRemoveSeguridad={data.handleRemoveSeguridad}
        onClose={data.handleCloseSeguridadDialog}
      />
    </div>
  )
}
