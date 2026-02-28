import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ScanLine,
  DollarSign,
  X,
  UtensilsCrossed,
  AlertCircle,
  MapPin,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { mesasRPCService } from '@/services/mesas-rpc.service'
import { useAuthStore } from '@/stores/auth.store'

export function BartenderScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)

  // Modal states
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [showAlreadyDelivered, setShowAlreadyDelivered] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  const [ventaInfo, setVentaInfo] = useState<any>(null)
  const [currentQrCode, setCurrentQrCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const { user } = useAuthStore()

  const isProcessingRef = useRef(false)
  const handleQRDetectedRef = useRef<((qr: string) => Promise<void>) | null>(null)

  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          const state = scanner.getState()
          if (state === 2) scanner.stop().catch(() => {})
        } catch {}
      }
    }
  }, [scanner])

  const startScanner = useCallback(async () => {
    if (scanner) return

    setScanning(true)
    await new Promise(resolve => setTimeout(resolve, 100))

    const readerElement = document.getElementById('qr-reader')
    if (!readerElement) {
      setScanning(false)
      return
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader')

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (handleQRDetectedRef.current) {
            await handleQRDetectedRef.current(decodedText)
          }
        },
        () => {}
      )

      setScanner(html5QrCode)
    } catch (err: any) {
      setScanning(false)
      setScanner(null)
      toast.error('Error al iniciar cámara', {
        description: err?.message || 'Verifica los permisos',
      })
    }
  }, [scanner])

  const stopScannerSafe = async (sc: Html5Qrcode | null) => {
    if (!sc) return
    try {
      const state = sc.getState()
      if (state === 2) await sc.stop()
    } catch {}
  }

  const handleQRDetected = useCallback(async (qrCode: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    // Stop scanner
    if (scanner) {
      await stopScannerSafe(scanner)
      setScanning(false)
      setScanner(null)
    }

    try {
      // Verify only - don't deliver yet
      const { data, error } = await mesasRPCService.escanearMesaBartender(qrCode, false)

      if (error) {
        setErrorMessage(error.message)
        setShowError(true)
        return
      }

      if (!data || !data.success) {
        setErrorMessage(data?.error || 'QR inválido')
        setVentaInfo(data)
        // Check if already delivered
        if (data?.error?.includes('entregada') || data?.error?.includes('ya fue')) {
          setShowAlreadyDelivered(true)
        } else {
          setShowError(true)
        }
        return
      }

      // Show confirmation modal
      setVentaInfo(data)
      setCurrentQrCode(qrCode)
      setShowConfirmation(true)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error desconocido')
      setShowError(true)
    }
  }, [scanner])

  useEffect(() => {
    handleQRDetectedRef.current = handleQRDetected
  }, [handleQRDetected])

  const handleConfirmEntrega = async () => {
    if (!currentQrCode) return
    setIsProcessingAction(true)

    const { data, error } = await mesasRPCService.escanearMesaBartender(currentQrCode, true)

    if (error || !data?.success) {
      toast.error('Error al entregar', {
        description: error?.message || data?.error || 'Error desconocido',
      })
      setIsProcessingAction(false)
      return
    }

    setVentaInfo(data)
    setShowConfirmation(false)
    setShowSuccess(true)
    setIsProcessingAction(false)
  }

  const handleNuevoEscaneo = useCallback(async () => {
    // Reset all states
    setShowConfirmation(false)
    setShowSuccess(false)
    setShowError(false)
    setShowAlreadyDelivered(false)
    setVentaInfo(null)
    setCurrentQrCode('')
    setErrorMessage('')

    // Stop existing scanner
    if (scanner) {
      await stopScannerSafe(scanner)
      try { scanner.clear() } catch {}
    }
    setScanner(null)
    setScanning(false)
    isProcessingRef.current = false

    // Restart
    setScanning(true)
    await new Promise(resolve => setTimeout(resolve, 150))

    const readerElement = document.getElementById('qr-reader')
    if (!readerElement) {
      setScanning(false)
      return
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (handleQRDetectedRef.current) {
            await handleQRDetectedRef.current(decodedText)
          }
        },
        () => {}
      )
      setScanner(html5QrCode)
    } catch (err: any) {
      setScanning(false)
      setScanner(null)
      toast.error('Error al reiniciar cámara', {
        description: err?.message || 'Intenta nuevamente',
      })
    }
  }, [scanner])

  const anyModalOpen = showConfirmation || showSuccess || showError || showAlreadyDelivered

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {user && (
          <p className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hola {user.personal.nombre} 🍹
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight">Escáner de Consumiciones</h1>
        <p className="text-muted-foreground">
          Escanea el QR para entregar las consumiciones de mesas
        </p>
      </div>

      {/* Scanner card - hidden when modal is open */}
      <Card className={anyModalOpen ? 'hidden' : ''}>
        <CardHeader>
          <CardTitle>Escáner de QR</CardTitle>
          <CardDescription>
            {!scanning
              ? 'Presiona el botón para iniciar el escáner'
              : 'Apunta la cámara al código QR de la mesa'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scanning ? (
            <Button onClick={startScanner} className="w-full gap-2" size="lg">
              <ScanLine className="h-5 w-5" />
              Iniciar Escáner
            </Button>
          ) : (
            <>
              <div id="qr-reader" className="rounded-lg overflow-hidden border"></div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ScanLine className="h-4 w-4 animate-pulse" />
                <span>Buscando código QR...</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {/* Confirmation Modal */}
        {showConfirmation && ventaInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-purple-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={handleNuevoEscaneo}
                disabled={isProcessingAction}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-purple-500 flex items-center justify-center">
                    <UtensilsCrossed className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                <div className="space-y-4 text-center">
                  <h2 className="text-2xl font-bold text-purple-600">Confirmar Entrega</h2>

                  {/* Mesa + Sector */}
                  {ventaInfo.mesa_nombre && (
                    <p className="text-3xl font-black text-gray-900 dark:text-white">
                      {ventaInfo.mesa_nombre}
                    </p>
                  )}

                  {ventaInfo.sector_nombre && (
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{ventaInfo.sector_nombre}</span>
                    </div>
                  )}

                  {/* Client info */}
                  {ventaInfo.cliente_nombre && (
                    <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                      <p className="text-xl font-semibold">
                        {ventaInfo.cliente_nombre}
                      </p>
                    </div>
                  )}

                  {/* Consumicion details */}
                  {(ventaInfo.detalle_consumicion || (ventaInfo.monto_consumicion != null && Number(ventaInfo.monto_consumicion) > 0)) && (
                    <div className="bg-gray-50 dark:bg-gray-900 border p-4 rounded-lg space-y-2">
                      {ventaInfo.detalle_consumicion && (
                        <div>
                          <p className="text-xs text-muted-foreground">Detalle</p>
                          <p className="text-xl font-semibold">{ventaInfo.detalle_consumicion}</p>
                        </div>
                      )}
                      {ventaInfo.monto_consumicion != null && Number(ventaInfo.monto_consumicion) > 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-semibold">${Number(ventaInfo.monto_consumicion).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3 mt-6">
                    <Button
                      onClick={handleConfirmEntrega}
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                      disabled={isProcessingAction}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Entregar Consumición
                    </Button>
                    <Button
                      onClick={handleNuevoEscaneo}
                      size="lg"
                      variant="outline"
                      className="w-full text-lg py-6"
                      disabled={isProcessingAction}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success Modal */}
        {showSuccess && ventaInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-green-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={handleNuevoEscaneo}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                <div className="space-y-4 text-center">
                  <h2 className="text-3xl font-bold text-green-600">Consumición Entregada</h2>

                  {ventaInfo.mesa_nombre && (
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {ventaInfo.mesa_nombre}
                    </p>
                  )}

                  {ventaInfo.sector_nombre && (
                    <p className="text-muted-foreground">{ventaInfo.sector_nombre}</p>
                  )}

                  {(ventaInfo.cliente_nombre || ventaInfo.nombre_cliente) && (
                    <p className="text-lg font-semibold">
                      {ventaInfo.cliente_nombre || `${ventaInfo.nombre_cliente} ${ventaInfo.apellido_cliente || ''}`}
                    </p>
                  )}

                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Already Delivered Modal */}
        {showAlreadyDelivered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-amber-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={handleNuevoEscaneo}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center">
                    <UtensilsCrossed className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                <div className="space-y-4 text-center">
                  <h2 className="text-2xl font-bold text-amber-600">Consumición Ya Entregada</h2>

                  {ventaInfo?.mesa_nombre && (
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {ventaInfo.mesa_nombre}
                    </p>
                  )}

                  {ventaInfo?.sector_nombre && (
                    <p className="text-muted-foreground">{ventaInfo.sector_nombre}</p>
                  )}

                  {(ventaInfo?.cliente_nombre || ventaInfo?.nombre_cliente) && (
                    <p className="text-lg font-semibold">
                      {ventaInfo.cliente_nombre || `${ventaInfo.nombre_cliente} ${ventaInfo.apellido_cliente || ''}`}
                    </p>
                  )}

                  {ventaInfo?.fecha_entrega_consumicion && (
                    <p className="text-sm text-muted-foreground">
                      Entregada el {new Date(ventaInfo.fecha_entrega_consumicion).toLocaleString('es-AR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}

                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-amber-600 hover:bg-amber-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error Modal */}
        {showError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-red-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={handleNuevoEscaneo}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{
                    scale: { type: 'spring', stiffness: 200, damping: 15 },
                    rotate: { duration: 0.5, delay: 0.2 },
                  }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertCircle className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                <div className="space-y-4 text-center">
                  <h2 className="text-3xl font-bold text-red-600">Error</h2>
                  <p className="text-lg text-muted-foreground">{errorMessage}</p>

                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
