import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { invitadosService } from '@/services/invitados.service'
import { mesasRPCService } from '@/services/mesas-rpc.service'
import { supabase } from '@/lib/supabase'
import type { InvitadoConDetalles, RazonRechazoType, VentaMesaResult } from '@/types/database'
import { toast } from 'sonner'
import { Html5Qrcode } from 'html5-qrcode'

export function useScannerData() {
  const { user, signOut } = useAuthStore()
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
  const [invitado, setInvitado] = useState<InvitadoConDetalles | null>(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showErrorAnimation, setShowErrorAnimation] = useState(false)
  const [errorReason, setErrorReason] = useState<'ya_ingresado' | 'lote_desactivado' | 'lote_no_asignado' | 'ya_rechazado'>('ya_ingresado')
  const [showInvalidQRAnimation, setShowInvalidQRAnimation] = useState(false)

  // Estados para el flujo de confirmación
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRazon, setSelectedRazon] = useState<RazonRechazoType | null>(null)
  const [razonDetalle, setRazonDetalle] = useState('')
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Estado para mostrar rechazo exitoso
  const [showRejectSuccessAnimation, setShowRejectSuccessAnimation] = useState(false)

  // Estados para el flujo de rechazo reversible
  const [showRejectedModal, setShowRejectedModal] = useState(false)
  const [rejectionInfo, setRejectionInfo] = useState<{
    razon: RazonRechazoType | null
    detalle: string | null
    fecha: string | null
  }>({ razon: null, detalle: null, fecha: null })
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Estados para mesa QR
  const [mesaResult, setMesaResult] = useState<VentaMesaResult | null>(null)
  const [mesaQrCode, setMesaQrCode] = useState<string>('')
  const [showMesaConfirmation, setShowMesaConfirmation] = useState(false)
  const [showMesaLimitReached, setShowMesaLimitReached] = useState(false)
  const [showMesaLocation, setShowMesaLocation] = useState(false)
  const [showMesaSuccess, setShowMesaSuccess] = useState(false)
  const [showMesaError, setShowMesaError] = useState(false)
  const [mesaErrorMessage, setMesaErrorMessage] = useState('')

  // Usar useRef para bandera inmediata (no espera re-render)
  const isProcessingRef = useRef(false)
  const handleQRDetectedRef = useRef<((qrCode: string) => Promise<void>) | null>(null)

  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          const state = scanner.getState()
          if (state === 2) {
            scanner.stop().catch(() => {})
          }
        } catch (err) {
          // Ignorar errores en cleanup
        }
      }
    }
  }, [scanner])

  const startScanner = useCallback(async () => {
    try {
      if (scanner) {
        return
      }

      if (!scanning) {
        setScanning(true)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const readerElement = document.getElementById('reader')

      if (!readerElement) {
        setScanning(false)
        return
      }

      const html5QrCode = new Html5Qrcode('reader')

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
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
  }, [scanning, scanner])

  const stopScanner = async () => {
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === 2) {
          await scanner.stop()
        }
      } catch (err) {
        // Ignorar errores
      } finally {
        setScanning(false)
        setScanner(null)
      }
    }
  }

  const handleQRDetected = useCallback(async (qrCode: string) => {
    try {
      if (isProcessingRef.current) {
        return
      }

      isProcessingRef.current = true

    // VERIFICAR SI EL USUARIO ESTÁ ACTIVO
    if (user) {
      const { isActive, error } = await authService.checkUserActive(user.id)

      if (error) {
        toast.error('Error al verificar estado del usuario', {
          description: error.message,
        })
        isProcessingRef.current = false
        return
      }

      if (!isActive) {
        toast.error('Usuario inactivo', {
          description: 'Tu cuenta ha sido desactivada. Contacta con un administrador.',
        })

        if (scanner) {
          try {
            const state = scanner.getState()
            if (state === 2) {
              await scanner.stop()
            }
          } catch (err) {
            // Ignorar errores
          }
          setScanning(false)
          setScanner(null)
        }

        await signOut('Tu cuenta ha sido deshabilitada, contacta con un administrador')
        return
      }
    }

    // PASO 1: Detener el scanner inmediatamente
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === 2) {
          await scanner.stop()
        }
      } catch (err) {
        // Ignorar
      }
      setScanning(false)
      setScanner(null)
    }

    // PASO 2: Consultar información del invitado
    const { data: invitadoData, error: invitadoError } = await invitadosService.getInvitadoByQR(qrCode)

    if (invitadoError || !invitadoData) {
      // Check if it's a mesa QR
      if (qrCode.startsWith('MESA-')) {
        const { data: mesaData, error: mesaError } = await mesasRPCService.escanearMesaSeguridad(qrCode, true)

        if (mesaError) {
          setMesaErrorMessage(mesaError.message)
          setShowMesaError(true)
          return
        }

        if (mesaData && mesaData.success) {
          setMesaResult(mesaData)
          setMesaQrCode(qrCode)
          if (mesaData.max_personas && mesaData.escaneos_actuales !== undefined && mesaData.escaneos_actuales >= mesaData.max_personas) {
            setShowMesaLimitReached(true)
          } else {
            setShowMesaConfirmation(true)
          }
          return
        }

        if (mesaData && !mesaData.success) {
          setMesaQrCode(qrCode)
          if (mesaData.error?.includes('límite') || mesaData.error?.includes('limit')) {
            if (!mesaData.sector_imagen_url) {
              const { data: mesaInfo } = await supabase
                .from('ventas_mesas')
                .select('mesas!inner(nombre, coordenada_x, coordenada_y, max_personas, uuid_sector, sectores!inner(nombre, imagen_url))')
                .eq('qr_code', qrCode)
                .single()

              if (mesaInfo) {
                const mesa = (mesaInfo as any).mesas
                const sector = mesa?.sectores
                mesaData.mesa_nombre = mesaData.mesa_nombre || mesa?.nombre
                mesaData.coordenada_x = mesaData.coordenada_x ?? mesa?.coordenada_x
                mesaData.coordenada_y = mesaData.coordenada_y ?? mesa?.coordenada_y
                mesaData.max_personas = mesaData.max_personas ?? mesa?.max_personas
                mesaData.sector_nombre = mesaData.sector_nombre || sector?.nombre
                mesaData.sector_imagen_url = mesaData.sector_imagen_url || sector?.imagen_url
              }
            }
            setMesaResult(mesaData)
            setShowMesaLimitReached(true)
          } else {
            setMesaResult(mesaData)
            setMesaErrorMessage(mesaData.error || 'Error desconocido')
            setShowMesaError(true)
          }
          return
        }
      }

      setShowInvalidQRAnimation(true)
      return
    }

    // PASO 3: Verificar permisos de ingreso usando la RPC (solo verificar)
    const { data: ingresoResult, error: ingresoError } = await invitadosService.marcarIngreso(qrCode, false, true)

    if (ingresoError) {
      toast.error('Error al verificar ingreso', {
        description: ingresoError.message,
      })
      isProcessingRef.current = false
      return
    }

    // PASO 4: Manejar validaciones de lote
    if (ingresoResult && !ingresoResult.success) {
      setInvitado(invitadoData)

      if (ingresoResult.lote_no_asignado) {
        setErrorMessage(ingresoResult.error || `Este cliente pertenece al lote "${ingresoResult.lote_nombre || 'desconocido'}"`)
        setErrorReason('lote_no_asignado')
        setShowErrorAnimation(true)
        return
      }

      if (ingresoResult.lote_desactivado) {
        toast.error('Lote desactivado', {
          description: 'Este lote ha sido desactivado por el administrador.',
        })
        setErrorReason('lote_desactivado')
        setShowErrorAnimation(true)
        return
      }

      if (ingresoResult.rechazado && ingresoResult.puede_resolver) {
        setRejectionInfo({
          razon: (ingresoResult.razon_rechazo as RazonRechazoType) || null,
          detalle: ingresoResult.razon_rechazo_detalle || null,
          fecha: ingresoResult.fecha_rechazo || null,
        })
        setShowRejectedModal(true)
        return
      }

      if (ingresoResult.already_ingresado) {
        setErrorReason('ya_ingresado')
        setShowErrorAnimation(true)
        return
      }

      if (ingresoResult.error) {
        toast.error('Error al verificar ingreso', {
          description: ingresoResult.error,
        })
        isProcessingRef.current = false
        return
      }
    }

    // PASO 5: Si pasó todas las validaciones, mostrar modal de confirmación
    setInvitado(invitadoData)

    const esVip = invitadoData.lote?.es_vip || false

    if (esVip) {
      if (!invitadoData.ingresado) {
        setShowConfirmationModal(true)
      } else {
        setShowSuccessAnimation(true)
      }
    } else {
      if (invitadoData.ingresado) {
        setErrorReason('ya_ingresado')
        setShowErrorAnimation(true)
      } else {
        setShowConfirmationModal(true)
      }
    }
    } catch (err: any) {
      toast.error('Error al procesar QR', {
        description: err?.message || 'Intenta nuevamente',
      })
      isProcessingRef.current = false
    }
  }, [user, scanner, signOut])

  // Actualizar la referencia cada vez que cambie handleQRDetected
  useEffect(() => {
    handleQRDetectedRef.current = handleQRDetected
  }, [handleQRDetected])

  const handleConfirmIngreso = async () => {
    if (!invitado) return

    setIsProcessingAction(true)

    const { data, error } = await invitadosService.marcarIngreso(invitado.qr_code, false, false)

    if (error) {
      toast.error('Error al marcar ingreso', {
        description: error.message,
      })
      setIsProcessingAction(false)
      return
    }

    if (data && !data.success) {
      toast.error('No se puede marcar ingreso', {
        description: data.error || 'Error desconocido',
      })
      setIsProcessingAction(false)
      return
    }

    setInvitado({ ...invitado, ingresado: true, fecha_ingreso: new Date().toISOString() })
    setShowConfirmationModal(false)
    setShowSuccessAnimation(true)
    setIsProcessingAction(false)
  }

  const handleShowRejectOptions = () => {
    setShowConfirmationModal(false)
    setShowRejectModal(true)
    setSelectedRazon(null)
    setRazonDetalle('')
  }

  const handleConfirmRechazo = async () => {
    if (!invitado || !selectedRazon) return

    if (selectedRazon === 'otro' && !razonDetalle.trim()) {
      toast.error('Debes especificar la razón del rechazo')
      return
    }

    setIsProcessingAction(true)

    const { error } = await invitadosService.rechazarInvitado(
      invitado.qr_code,
      selectedRazon,
      razonDetalle.trim() || undefined
    )

    if (error) {
      toast.error('Error al rechazar invitado', {
        description: error.message,
      })
      setIsProcessingAction(false)
      return
    }

    setInvitado({
      ...invitado,
      rechazado: true,
      razon_rechazo: selectedRazon,
      razon_rechazo_detalle: selectedRazon === 'otro' ? razonDetalle.trim() : null,
      fecha_rechazo: new Date().toISOString(),
    })
    setShowRejectModal(false)
    setShowRejectSuccessAnimation(true)
    setIsProcessingAction(false)
  }

  const handleCancelReject = () => {
    setShowRejectModal(false)
    setShowConfirmationModal(true)
  }

  const handleResolveAndAllow = async () => {
    if (!invitado) return

    setIsProcessingAction(true)

    const { data, error } = await invitadosService.marcarIngreso(invitado.qr_code, true, false)

    if (error) {
      toast.error('Error al resolver rechazo', {
        description: error.message,
      })
      setIsProcessingAction(false)
      return
    }

    if (data && !data.success) {
      toast.error('No se puede resolver rechazo', {
        description: data.error || 'Error desconocido',
      })
      setIsProcessingAction(false)
      return
    }

    toast.success('Rechazo resuelto', {
      description: 'El invitado puede ingresar ahora',
    })

    setInvitado({
      ...invitado,
      ingresado: true,
      fecha_ingreso: new Date().toISOString(),
      rechazado: false,
      razon_rechazo: null,
      razon_rechazo_detalle: null,
      fecha_rechazo: null,
    })
    setShowRejectedModal(false)
    setShowSuccessAnimation(true)
    setIsProcessingAction(false)
  }

  const handleNuevoEscaneo = useCallback(async () => {
    // PASO 1: Cerrar modales
    setShowSuccessAnimation(false)
    setShowErrorAnimation(false)
    setShowInvalidQRAnimation(false)
    setShowConfirmationModal(false)
    setShowRejectModal(false)
    setShowRejectSuccessAnimation(false)
    setShowRejectedModal(false)
    setInvitado(null)
    setSelectedRazon(null)
    setRazonDetalle('')
    setRejectionInfo({ razon: null, detalle: null, fecha: null })
    setErrorMessage('')
    setMesaResult(null)
    setMesaQrCode('')
    setShowMesaConfirmation(false)
    setShowMesaLimitReached(false)
    setShowMesaLocation(false)
    setShowMesaSuccess(false)
    setShowMesaError(false)
    setMesaErrorMessage('')

    // PASO 2: DETENER completamente el scanner
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === 2) {
          await scanner.stop()
        }
      } catch (e) {
        // Ignorar errores
      }

      try {
        scanner.clear()
      } catch (e) {
        // Ignorar errores
      }
    }

    setScanner(null)
    setScanning(false)
    isProcessingRef.current = false

    // PASO 3: Forzar reinicio con estados limpios
    setScanning(true)
    await new Promise(resolve => setTimeout(resolve, 150))

    const readerElement = document.getElementById('reader')
    if (!readerElement) {
      setScanning(false)
      return
    }

    try {
      const html5QrCode = new Html5Qrcode('reader')

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
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

  const handleMaintainRejection = () => {
    setShowRejectedModal(false)
    setRejectionInfo({ razon: null, detalle: null, fecha: null })
    handleNuevoEscaneo()
  }

  const handleConfirmMesaIngreso = async () => {
    if (!mesaQrCode) return
    setIsProcessingAction(true)

    const { data, error } = await mesasRPCService.escanearMesaSeguridad(mesaQrCode, false)

    if (error) {
      toast.error('Error al marcar ingreso de mesa', { description: error.message })
      setIsProcessingAction(false)
      return
    }

    if (data && !data.success) {
      toast.error('No se pudo marcar ingreso', { description: data.error || 'Error desconocido' })
      setIsProcessingAction(false)
      return
    }

    if (data) {
      setMesaResult(data)
    }
    setShowMesaConfirmation(false)
    setShowMesaSuccess(true)
    setIsProcessingAction(false)
  }

  const handleShowMesaLocation = () => {
    if (!mesaResult?.sector_imagen_url) {
      toast.error('No hay imagen del sector disponible')
      return
    }
    setShowMesaConfirmation(false)
    setShowMesaLimitReached(false)
    setShowMesaSuccess(false)
    setShowMesaError(false)
    setShowMesaLocation(true)
  }

  const handleCloseMesaLocation = () => {
    setShowMesaLocation(false)
    handleNuevoEscaneo()
  }

  // Computed: any modal is open
  const anyModalOpen = showSuccessAnimation || showErrorAnimation || showInvalidQRAnimation || showConfirmationModal || showRejectModal || showRejectSuccessAnimation || showRejectedModal || showMesaConfirmation || showMesaLimitReached || showMesaLocation || showMesaSuccess || showMesaError

  return {
    scanning,
    invitado,
    showSuccessAnimation,
    showErrorAnimation,
    errorReason,
    showInvalidQRAnimation,
    showConfirmationModal,
    showRejectModal,
    selectedRazon,
    setSelectedRazon,
    razonDetalle,
    setRazonDetalle,
    isProcessingAction,
    showRejectSuccessAnimation,
    showRejectedModal,
    rejectionInfo,
    errorMessage,
    mesaResult,
    showMesaConfirmation,
    showMesaLimitReached,
    showMesaLocation,
    showMesaSuccess,
    showMesaError,
    mesaErrorMessage,
    anyModalOpen,
    startScanner,
    stopScanner,
    handleConfirmIngreso,
    handleShowRejectOptions,
    handleConfirmRechazo,
    handleCancelReject,
    handleResolveAndAllow,
    handleMaintainRejection,
    handleConfirmMesaIngreso,
    handleShowMesaLocation,
    handleCloseMesaLocation,
    handleNuevoEscaneo,
  }
}
