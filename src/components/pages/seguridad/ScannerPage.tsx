import { useScannerData } from './scanner/useScannerData'
import { useAuthStore } from '@/stores/auth.store'
import { ScannerCamera } from './scanner/ScannerCamera'
import { InvitadoConfirmationModal } from './scanner/InvitadoConfirmationModal'
import { InvitadoRejectionModal } from './scanner/InvitadoRejectionModal'
import { InvitadoRejectedModal } from './scanner/InvitadoRejectedModal'
import { InvitadoSuccessModal } from './scanner/InvitadoSuccessModal'
import { InvitadoErrorModal } from './scanner/InvitadoErrorModal'
import { InvitadoRejectSuccessModal } from './scanner/InvitadoRejectSuccessModal'
import { InvalidQRModal } from './scanner/InvalidQRModal'
import { MesaConfirmationModal } from './scanner/MesaConfirmationModal'
import { MesaLimitReachedModal } from './scanner/MesaLimitReachedModal'
import { MesaSuccessModal } from './scanner/MesaSuccessModal'
import { MesaErrorModal } from './scanner/MesaErrorModal'
import { MesaLocationView } from '@/features/mesas/components'
import { AnimatePresence } from 'framer-motion'

export function ScannerPage() {
  const data = useScannerData()
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {user && (
          <p className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hola {user.personal.nombre} 👋
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight">Escanear QR</h1>
        <p className="text-muted-foreground">
          Escanea el QR de los invitados para marcar su ingreso
        </p>
      </div>

      <ScannerCamera
        scanning={data.scanning}
        hidden={data.anyModalOpen}
        onStart={data.startScanner}
        onStop={data.stopScanner}
      />

      <AnimatePresence>
        {data.showRejectedModal && data.invitado && (
          <InvitadoRejectedModal
            invitado={data.invitado}
            rejectionInfo={data.rejectionInfo}
            isProcessingAction={data.isProcessingAction}
            onResolveAndAllow={data.handleResolveAndAllow}
            onMaintainRejection={data.handleMaintainRejection}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showConfirmationModal && data.invitado && (
          <InvitadoConfirmationModal
            invitado={data.invitado}
            isProcessingAction={data.isProcessingAction}
            onConfirmIngreso={data.handleConfirmIngreso}
            onShowRejectOptions={data.handleShowRejectOptions}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showRejectModal && data.invitado && (
          <InvitadoRejectionModal
            invitado={data.invitado}
            selectedRazon={data.selectedRazon}
            razonDetalle={data.razonDetalle}
            isProcessingAction={data.isProcessingAction}
            onSelectRazon={data.setSelectedRazon}
            onChangeDetalle={data.setRazonDetalle}
            onConfirmRechazo={data.handleConfirmRechazo}
            onCancelReject={data.handleCancelReject}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showRejectSuccessAnimation && data.invitado && (
          <InvitadoRejectSuccessModal
            invitado={data.invitado}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showSuccessAnimation && data.invitado && (
          <InvitadoSuccessModal
            invitado={data.invitado}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showErrorAnimation && data.invitado && (
          <InvitadoErrorModal
            invitado={data.invitado}
            errorReason={data.errorReason}
            errorMessage={data.errorMessage}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showInvalidQRAnimation && (
          <InvalidQRModal onNuevoEscaneo={data.handleNuevoEscaneo} />
        )}

        {data.showMesaConfirmation && data.mesaResult && (
          <MesaConfirmationModal
            mesaResult={data.mesaResult}
            isProcessingAction={data.isProcessingAction}
            onConfirmMesaIngreso={data.handleConfirmMesaIngreso}
            onShowMesaLocation={data.handleShowMesaLocation}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showMesaLimitReached && data.mesaResult && (
          <MesaLimitReachedModal
            mesaResult={data.mesaResult}
            onShowMesaLocation={data.handleShowMesaLocation}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showMesaSuccess && data.mesaResult && (
          <MesaSuccessModal
            mesaResult={data.mesaResult}
            onShowMesaLocation={data.handleShowMesaLocation}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showMesaError && (
          <MesaErrorModal
            mesaErrorMessage={data.mesaErrorMessage}
            onNuevoEscaneo={data.handleNuevoEscaneo}
          />
        )}

        {data.showMesaLocation && data.mesaResult && data.mesaResult.sector_imagen_url && (
          <MesaLocationView
            sectorImagenUrl={data.mesaResult.sector_imagen_url}
            mesaNombre={data.mesaResult.mesa_nombre || 'Mesa'}
            sectorNombre={data.mesaResult.sector_nombre || 'Sector'}
            coordenadaX={data.mesaResult.coordenada_x || 50}
            coordenadaY={data.mesaResult.coordenada_y || 50}
            onClose={data.handleCloseMesaLocation}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
