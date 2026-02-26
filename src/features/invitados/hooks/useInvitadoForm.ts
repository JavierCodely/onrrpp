import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { invitadosService, type InvitadoConLote } from '@/services/invitados.service'
import { ventasService } from '@/services/ventas.service'
import { ubicacionesService } from '@/services/ubicaciones.service'
import type { InvitadoFormData } from '../types'
import type { Lote, MetodoPago } from '@/types/database'
import { toast } from 'sonner'

interface UseInvitadoFormOptions {
  selectedInvitado: InvitadoConLote | null
  selectedEvento: string
  lotes: Lote[]
  onSuccess: () => void
  onShowQR?: (invitado: InvitadoConLote) => void
  loadInvitados: () => Promise<InvitadoConLote[]>
  loadLotes: () => void
}

export function useInvitadoForm({
  selectedInvitado,
  selectedEvento,
  lotes,
  onSuccess,
  onShowQR,
  loadInvitados,
  loadLotes,
}: UseInvitadoFormOptions) {
  const { user } = useAuthStore()

  const [formData, setFormData] = useState<InvitadoFormData>({
    dni: '',
    nombre: '',
    apellido: '',
    edad: '',
    departamento: '',
    localidad: '',
    sexo: '',
    uuid_lote: '',
    metodo_pago: '',
    monto_efectivo: '',
    monto_transferencia: '',
    observaciones: '',
    profile_image_url: '',
  })

  const [selectedLotePrecio, setSelectedLotePrecio] = useState<number>(0)
  const [selectedLoteEsVip, setSelectedLoteEsVip] = useState<boolean>(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ventaInfo, setVentaInfo] = useState<{
    metodo_pago: string
    monto_total: number
    observaciones: string | null
  } | null>(null)

  const [localidades, setLocalidades] = useState<string[]>([])

  // Cargar datos del invitado en modo edición
  useEffect(() => {
    if (selectedInvitado) {
      setFormData({
        dni: selectedInvitado.dni,
        nombre: selectedInvitado.nombre,
        apellido: selectedInvitado.apellido,
        edad: selectedInvitado.edad?.toString() || '',
        departamento: selectedInvitado.departamento || '',
        localidad: selectedInvitado.localidad || '',
        sexo: selectedInvitado.sexo,
        uuid_lote: selectedInvitado.uuid_lote || '',
        metodo_pago: '',
        monto_efectivo: '',
        monto_transferencia: '',
        observaciones: '',
        profile_image_url: selectedInvitado.profile_image_url || '',
      })

      if (selectedInvitado.lote) {
        setSelectedLotePrecio(selectedInvitado.lote.precio)
        setSelectedLoteEsVip(selectedInvitado.lote.es_vip)
      }

      if (selectedInvitado.profile_image_url) {
        setProfileImagePreview(selectedInvitado.profile_image_url)
      }

      // Cargar localidades del departamento si existe
      if (selectedInvitado.departamento) {
        ubicacionesService.getLocalidadesByDepartamento(selectedInvitado.departamento).then(({ data }) => {
          if (data) setLocalidades(data)
        })
      }

      // Cargar información de venta si existe
      ventasService.getVentaByInvitado(selectedInvitado.id).then((venta) => {
        if (venta) {
          setVentaInfo({
            metodo_pago: venta.metodo_pago,
            monto_total: Number(venta.monto_total),
            observaciones: venta.observaciones,
          })
          setFormData(prev => ({
            ...prev,
            metodo_pago: venta.metodo_pago,
            observaciones: venta.observaciones || '',
          }))
        }
      }).catch(() => {
        setVentaInfo(null)
      })
    }
  }, [selectedInvitado])

  const handleDepartamentoChange = async (value: string) => {
    setFormData({ ...formData, departamento: value, localidad: '' })

    // Cargar localidades del departamento seleccionado
    const { data, error } = await ubicacionesService.getLocalidadesByDepartamento(value)
    if (!error && data) {
      setLocalidades(data)
    }
  }

  const handleLoteChange = (value: string) => {
    const lote = lotes.find(l => l.id === value)
    const nuevoPrecio = lote?.precio || 0
    const esVip = lote?.es_vip || false

    setFormData({
      ...formData,
      uuid_lote: value,
      // Resetear campos de pago al cambiar de lote
      metodo_pago: '',
      monto_efectivo: '',
      monto_transferencia: '',
    })
    setSelectedLotePrecio(nuevoPrecio)
    setSelectedLoteEsVip(esVip)

    // Si estamos editando, actualizar/crear ventaInfo
    if (selectedInvitado) {
      if (nuevoPrecio === 0) {
        // Lote gratis: limpiar ventaInfo
        setVentaInfo(null)
      } else {
        // Lote con precio: actualizar o crear ventaInfo
        if (ventaInfo) {
          // Ya existe, actualizar monto
          setVentaInfo({
            ...ventaInfo,
            monto_total: nuevoPrecio
          })
        } else {
          // No existe (era gratis), crear nuevo
          setVentaInfo({
            metodo_pago: '',
            monto_total: nuevoPrecio,
            observaciones: null
          })
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !selectedEvento) return

    // Evitar múltiples envíos
    if (submitting) return
    setSubmitting(true)

    // Validaciones
    if (!formData.sexo) {
      toast.error('Debe seleccionar el sexo')
      setSubmitting(false)
      return
    }

    if (!formData.departamento || !formData.localidad) {
      toast.error('Debe seleccionar departamento y localidad')
      setSubmitting(false)
      return
    }

    if (!formData.uuid_lote) {
      toast.error('Debe seleccionar un lote')
      setSubmitting(false)
      return
    }

    const loteSeleccionado = lotes.find(l => l.id === formData.uuid_lote)

    if (!loteSeleccionado) {
      toast.error('El lote seleccionado no existe')
      setSubmitting(false)
      return
    }

    // Validar imagen de perfil para lotes VIP
    if (loteSeleccionado && loteSeleccionado.es_vip) {
      if (!selectedInvitado && !profileImageFile) {
        toast.error('La imagen de perfil es obligatoria para invitados VIP')
        setSubmitting(false)
        return
      }
      if (selectedInvitado && !formData.profile_image_url && !profileImageFile) {
        toast.error('La imagen de perfil es obligatoria para invitados VIP')
        setSubmitting(false)
        return
      }
    }

    // Validar campos de pago
    if (loteSeleccionado && loteSeleccionado.precio > 0) {
      if (!selectedInvitado && !formData.metodo_pago) {
        toast.error('Debe seleccionar un método de pago')
        setSubmitting(false)
        return
      }

      // Validar montos solo cuando se está creando (no al editar)
      if (!selectedInvitado) {
        const montoEfectivo = parseFloat(formData.monto_efectivo) || 0
        const montoTransferencia = parseFloat(formData.monto_transferencia) || 0
        const total = montoEfectivo + montoTransferencia

        if (formData.metodo_pago === 'efectivo') {
          if (montoEfectivo !== loteSeleccionado.precio) {
            toast.error('El monto en efectivo debe ser igual al precio del lote')
            setSubmitting(false)
            return
          }
        } else if (formData.metodo_pago === 'transferencia') {
          if (montoTransferencia !== loteSeleccionado.precio) {
            toast.error('El monto en transferencia debe ser igual al precio del lote')
            setSubmitting(false)
            return
          }
        } else if (formData.metodo_pago === 'mixto') {
          if (montoEfectivo === 0 || montoTransferencia === 0) {
            toast.error('Debe ingresar montos tanto en efectivo como en transferencia')
            setSubmitting(false)
            return
          }
          if (total !== loteSeleccionado.precio) {
            toast.error(`La suma de efectivo y transferencia debe ser igual al precio del lote ($${loteSeleccionado.precio})`)
            setSubmitting(false)
            return
          }
        }
      }
    }

    // Subir imagen de perfil si hay una nueva
    let profileImageUrl = formData.profile_image_url
    if (profileImageFile) {
      setUploadingImage(true)
      const tempId = selectedInvitado?.id || `temp-${Date.now()}`
      const { url, error: uploadError } = await invitadosService.uploadProfileImage(
        profileImageFile,
        user.club.id,
        tempId
      )
      setUploadingImage(false)

      if (uploadError) {
        toast.error('Error al subir la imagen de perfil', {
          description: uploadError.message,
        })
        setSubmitting(false)
        return
      }

      profileImageUrl = url || ''

      // Si estamos editando y había una imagen anterior, eliminarla
      if (selectedInvitado && selectedInvitado.profile_image_url && selectedInvitado.profile_image_url !== profileImageUrl) {
        await invitadosService.deleteProfileImage(selectedInvitado.profile_image_url, user.club.id)
      }
    }

    if (selectedInvitado) {
      // Actualizar invitado
      await updateInvitado(loteSeleccionado, profileImageUrl)
    } else {
      // Crear invitado
      await createInvitado(loteSeleccionado, profileImageUrl)
    }
  }

  const updateInvitado = async (loteSeleccionado: Lote, profileImageUrl: string) => {
    if (!selectedInvitado || !user) return

    const updateData = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      edad: formData.edad ? parseInt(formData.edad) : null,
      departamento: formData.departamento.trim() || null,
      localidad: formData.localidad.trim() || null,
      sexo: formData.sexo as 'hombre' | 'mujer',
      uuid_lote: formData.uuid_lote || null,
      profile_image_url: profileImageUrl || null,
    }

    const { error } = await invitadosService.updateInvitado(selectedInvitado.id, updateData)

    if (error) {
      console.error('Error completo al actualizar:', error)
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('completo') || errorMsg.includes('full')) {
        toast.error('Lote completo', { description: error.message })
      } else {
        toast.error('Error al actualizar invitado', { description: error.message })
      }
      loadLotes()
      setSubmitting(false)
      return
    }

    // Actualizar venta si existe o si cambió el lote
    await handleVentaUpdate(selectedInvitado, loteSeleccionado, updateData.uuid_lote)

    toast.success('Invitado actualizado correctamente')
    setSubmitting(false)
    onSuccess()
    loadInvitados()

    // Recargar lotes si el lote cambió
    if (selectedInvitado.uuid_lote !== updateData.uuid_lote) {
      loadLotes()
    }
  }

  const createInvitado = async (loteSeleccionado: Lote, profileImageUrl: string) => {
    if (!user) return

    if (!formData.dni.trim()) {
      toast.error('El DNI es obligatorio')
      setSubmitting(false)
      return
    }

    const createData = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      edad: formData.edad ? parseInt(formData.edad) : null,
      departamento: formData.departamento.trim() || null,
      localidad: formData.localidad.trim() || null,
      dni: formData.dni.trim(),
      sexo: formData.sexo as 'hombre' | 'mujer',
      uuid_evento: selectedEvento,
      uuid_lote: formData.uuid_lote,
      profile_image_url: profileImageUrl || null,
    }

    const { data, error } = await invitadosService.createInvitado(createData, user.id)

    if (error) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('completo') || errorMsg.includes('full')) {
        toast.error('Lote completo', { description: error.message })
      } else {
        toast.error('Error al crear invitado', { description: error.message })
      }
      loadLotes()
      setSubmitting(false)
      return
    }

    if (!data) {
      toast.error('Error al crear invitado')
      setSubmitting(false)
      return
    }

    // Si el lote tiene precio, crear venta
    if (loteSeleccionado && loteSeleccionado.precio > 0) {
      try {
        await ventasService.createVenta({
          uuid_invitado: data.id,
          uuid_evento: selectedEvento,
          uuid_lote: formData.uuid_lote,
          id_rrpp: user.id,
          metodo_pago: formData.metodo_pago as MetodoPago,
          monto_total: loteSeleccionado.precio,
          monto_efectivo: parseFloat(formData.monto_efectivo) || 0,
          monto_transferencia: parseFloat(formData.monto_transferencia) || 0,
          observaciones: formData.observaciones || undefined,
        })
        toast.success('Invitado creado y venta registrada correctamente')
      } catch (ventaError) {
        toast.warning('Invitado creado pero hubo un error al registrar la venta', {
          description: ventaError instanceof Error ? ventaError.message : 'Error desconocido',
        })
      }
    } else {
      toast.success('Invitado creado correctamente')
    }

    setSubmitting(false)
    onSuccess()

    // Recargar invitados y mostrar QR
    const invitadosActualizados = await loadInvitados()
    await loadLotes()

    if (data && invitadosActualizados && onShowQR) {
      const invitadoCreado = invitadosActualizados.find(i => i.id === data.id)
      if (invitadoCreado) {
        await onShowQR(invitadoCreado)
      }
    }
  }

  const handleVentaUpdate = async (
    selectedInvitado: InvitadoConLote,
    loteActual: Lote,
    newLoteId: string | null
  ) => {
    try {
      const ventaActual = await ventasService.getVentaByInvitado(selectedInvitado.id)

      if (ventaActual && loteActual && loteActual.precio > 0) {
        const cambioLote = selectedInvitado.uuid_lote !== newLoteId
        const cambioMetodoPago = formData.metodo_pago && ventaActual.metodo_pago !== formData.metodo_pago

        if (cambioLote || cambioMetodoPago) {
          let monto_efectivo = 0
          let monto_transferencia = 0
          const metodoPago = formData.metodo_pago || ventaActual.metodo_pago

          if (metodoPago === 'efectivo') {
            monto_efectivo = loteActual.precio
            monto_transferencia = 0
          } else if (metodoPago === 'transferencia') {
            monto_efectivo = 0
            monto_transferencia = loteActual.precio
          } else if (metodoPago === 'mixto') {
            if (!cambioMetodoPago && ventaActual.metodo_pago === 'mixto') {
              const totalAnterior = Number(ventaActual.monto_total)
              if (totalAnterior > 0) {
                const proporcionEfectivo = Number(ventaActual.monto_efectivo) / totalAnterior
                monto_efectivo = loteActual.precio * proporcionEfectivo
                monto_transferencia = loteActual.precio - monto_efectivo
              }
            } else {
              monto_efectivo = loteActual.precio / 2
              monto_transferencia = loteActual.precio / 2
            }
          }

          const updateDataVenta: any = {
            monto_total: loteActual.precio,
            monto_efectivo,
            monto_transferencia,
          }

          if (cambioLote) {
            updateDataVenta.uuid_lote = newLoteId!
          }

          if (cambioMetodoPago) {
            updateDataVenta.metodo_pago = formData.metodo_pago
          }

          if (formData.observaciones !== undefined) {
            updateDataVenta.observaciones = formData.observaciones || null
          }

          await ventasService.updateVenta(ventaActual.id, updateDataVenta)
        }
      } else if (ventaActual && (!loteActual || loteActual.precio === 0)) {
        await ventasService.deleteVenta(ventaActual.id)
        toast.info('Venta eliminada (lote cambiado a gratis)')
      } else if (!ventaActual && loteActual && loteActual.precio > 0 && formData.metodo_pago && user) {
        let monto_efectivo = 0
        let monto_transferencia = 0

        if (formData.metodo_pago === 'efectivo') {
          monto_efectivo = loteActual.precio
        } else if (formData.metodo_pago === 'transferencia') {
          monto_transferencia = loteActual.precio
        }

        await ventasService.createVenta({
          uuid_invitado: selectedInvitado.id,
          uuid_evento: selectedEvento,
          uuid_lote: newLoteId!,
          id_rrpp: user.id,
          metodo_pago: formData.metodo_pago as MetodoPago,
          monto_total: loteActual.precio,
          monto_efectivo,
          monto_transferencia,
          observaciones: formData.observaciones || undefined,
        })
        toast.info('Se creó una venta para el lote con precio')
      }
    } catch (ventaError) {
      console.error('Error al actualizar venta:', ventaError)
      toast.warning('Invitado actualizado, pero hubo un error al actualizar la venta')
    }
  }

  const resetForm = () => {
    setFormData({
      dni: '',
      nombre: '',
      apellido: '',
      edad: '',
      departamento: '',
      localidad: '',
      sexo: '',
      uuid_lote: '',
      metodo_pago: '',
      monto_efectivo: '',
      monto_transferencia: '',
      observaciones: '',
      profile_image_url: '',
    })
    setSelectedLotePrecio(0)
    setSelectedLoteEsVip(false)
    setVentaInfo(null)
    setProfileImageFile(null)
    setProfileImagePreview('')
    setLocalidades([])
    setSubmitting(false)
  }

  return {
    formData,
    setFormData,
    selectedLotePrecio,
    selectedLoteEsVip,
    profileImageFile,
    setProfileImageFile,
    profileImagePreview,
    setProfileImagePreview,
    uploadingImage,
    submitting,
    ventaInfo,
    localidades,
    setLocalidades,
    handleDepartamentoChange,
    handleLoteChange,
    handleSubmit,
    resetForm,
  }
}
