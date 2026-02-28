import { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Search, Loader2, UserCheck, Crown, X, MapPin, Calendar, User, Pencil, ChevronDown, Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { clientesService, type ClienteCheckResult } from '@/services/clientes.service'
import { invitadosService, type InvitadoConLote } from '@/services/invitados.service'
import { ventasService } from '@/services/ventas.service'
import { ubicacionesService } from '@/services/ubicaciones.service'
import type { Lote, MetodoPago, Evento, Venta, TipoMoneda } from '@/types/database'
import { MONEDA_LABELS, MONEDA_SIMBOLO } from '@/types/database'
import { toast } from 'sonner'

interface InvitadoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedInvitado: InvitadoConLote | null
  selectedEvento: string
  eventoData?: Evento
  lotes: Lote[]
  lotesDisponibles: Lote[]
  preselectedLoteId?: string
  onSuccess: () => void
  onShowQR?: (invitado: InvitadoConLote) => void
  loadInvitados: () => Promise<InvitadoConLote[]>
  loadLotes: () => void
}

// Valores por defecto para ubicación
const DEFAULT_PAIS = 'Argentina'
const DEFAULT_PROVINCIA = 'Misiones'

// Formatear DNI con separador de miles (puntos)
const formatDni = (value: string): string => {
  // Remover todo excepto números
  const numbers = value.replace(/\D/g, '')
  // Agregar separadores de miles
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Obtener solo los números del DNI (sin formato)
const unformatDni = (value: string): string => {
  return value.replace(/\D/g, '')
}

export function InvitadoFormDialog({
  open,
  onOpenChange,
  selectedInvitado,
  selectedEvento,
  eventoData,
  lotes,
  lotesDisponibles,
  preselectedLoteId,
  onSuccess,
  onShowQR,
  loadInvitados,
  loadLotes,
}: InvitadoFormDialogProps) {
  const { user } = useAuthStore()
  const isEditMode = !!selectedInvitado

  // Estados del DNI
  const [dniInput, setDniInput] = useState('')
  const [checkingDni, setCheckingDni] = useState(false)
  const [dniVerificado, setDniVerificado] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteCheckResult | null>(null)
  const [clienteDenegado, setClienteDenegado] = useState(false)
  const [dniYaEnEvento, setDniYaEnEvento] = useState(false)
  const [invitadoExistente, setInvitadoExistente] = useState<InvitadoConLote | null>(null)
  const [editandoCliente, setEditandoCliente] = useState(false)

  // Estados del formulario
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [edad, setEdad] = useState('')
  const [sexo, setSexo] = useState<'hombre' | 'mujer' | ''>('')

  // Estados de ubicación jerárquica
  const [pais, setPais] = useState(DEFAULT_PAIS)
  const [provincia, setProvincia] = useState(DEFAULT_PROVINCIA)
  const [departamento, setDepartamento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [ubicacionExpandida, setUbicacionExpandida] = useState(false)

  const [uuidLote, setUuidLote] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago | ''>('')
  const [moneda, setMoneda] = useState<TipoMoneda>('ARS')
  const [observaciones, setObservaciones] = useState('')
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState('')

  // Estados auxiliares para listas de ubicaciones
  const [paises, setPaises] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [localidades, setLocalidades] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [ventaExistente, setVentaExistente] = useState<Venta | null>(null)

  // Autocomplete DNI
  const [dniSuggestions, setDniSuggestions] = useState<Array<{ dni: string; nombre: string; apellido: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const pendingSearchRef = useRef(false)

  // Datos derivados
  const selectedLote = lotes.find(l => l.id === uuidLote)
  const selectedLoteEsVip = selectedLote?.es_vip || false

  // Precio según moneda seleccionada
  const getPrecioSegunMoneda = (lote: Lote | undefined, m: TipoMoneda): number => {
    if (!lote) return 0
    if (m === 'USD') return lote.precio_usd ?? lote.precio
    if (m === 'BRL') return lote.precio_reales ?? lote.precio
    return lote.precio
  }

  const selectedLotePrecio = getPrecioSegunMoneda(selectedLote, moneda)
  const requierePago = selectedLotePrecio > 0

  // El cliente existe y NO estamos editando sus datos (y el DNI no está ya en el evento)
  const mostrarDatosCliente = dniVerificado && clienteEncontrado && !clienteDenegado && !editandoCliente && !dniYaEnEvento
  // El cliente NO existe O estamos editando sus datos O es modo edición sin DNI verificado (mostrar datos actuales)
  // No mostrar si el DNI ya está en el evento
  const mostrarFormulario = !dniYaEnEvento && (
    (dniVerificado && !clienteDenegado && (!clienteEncontrado || editandoCliente)) ||
    (isEditMode && !dniVerificado)
  )

  // Cargar países al montar
  useEffect(() => {
    ubicacionesService.getPaises().then(({ data }) => {
      if (data) setPaises(data)
    })
  }, [])

  // Cargar provincias cuando cambia el país
  useEffect(() => {
    if (pais) {
      ubicacionesService.getProvinciasByPais(pais).then(({ data }) => {
        if (data) setProvincias(data)
      })
    }
  }, [pais])

  // Cargar departamentos cuando cambia país o provincia
  useEffect(() => {
    if (pais && provincia) {
      ubicacionesService.getDepartamentosByProvincia(pais, provincia).then(({ data }) => {
        if (data) setDepartamentos(data)
      })
    }
  }, [pais, provincia])

  // Cargar datos del invitado en modo edición
  useEffect(() => {
    if (selectedInvitado && open) {
      setDniInput(selectedInvitado.dni)
      setDniVerificado(false) // Permitir buscar otro DNI
      setNombre(selectedInvitado.nombre)
      setApellido(selectedInvitado.apellido)
      setEdad(selectedInvitado.edad?.toString() || '')
      setSexo(selectedInvitado.sexo)

      // Para país/provincia: solo usar defaults si es Argentina o no tiene país
      const invitadoPais = selectedInvitado.pais || DEFAULT_PAIS
      const esArgentina = invitadoPais === DEFAULT_PAIS
      setPais(invitadoPais)
      setProvincia(esArgentina ? (selectedInvitado.provincia || DEFAULT_PROVINCIA) : (selectedInvitado.provincia || ''))
      setDepartamento(selectedInvitado.departamento || '')
      setLocalidad(selectedInvitado.localidad || '')
      setUuidLote(selectedInvitado.uuid_lote || '')
      setProfileImagePreview(selectedInvitado.profile_image_url || '')

      // Verificar si la ubicación es diferente a la por defecto para expandir
      if ((selectedInvitado.pais && selectedInvitado.pais !== DEFAULT_PAIS) ||
          (selectedInvitado.provincia && selectedInvitado.provincia !== DEFAULT_PROVINCIA)) {
        setUbicacionExpandida(true)
      }

      // Cargar localidades del departamento si hay provincia
      if (selectedInvitado.departamento && selectedInvitado.provincia) {
        ubicacionesService.getLocalidadesByDepartamentoFull(invitadoPais, selectedInvitado.provincia, selectedInvitado.departamento).then(({ data }) => {
          if (data) setLocalidades(data)
        })
      }

      // Cargar venta existente si hay
      ventasService.getVentaByInvitado(selectedInvitado.id).then((venta) => {
        if (venta) {
          setVentaExistente(venta)
          setMetodoPago(venta.metodo_pago)
          setObservaciones(venta.observaciones || '')
          // Inicializar la moneda desde la venta existente
          if (venta.moneda) {
            setMoneda(venta.moneda as import('@/types/database').TipoMoneda)
          }
        }
      })
    }
  }, [selectedInvitado, open])

  // Resetear todo al cerrar el modal
  useEffect(() => {
    if (!open) {
      setDniInput('')
      setCheckingDni(false)
      setDniVerificado(false)
      setClienteEncontrado(null)
      setClienteDenegado(false)
      setDniYaEnEvento(false)
      setInvitadoExistente(null)
      setEditandoCliente(false)
      setNombre('')
      setApellido('')
      setEdad('')
      setSexo('')
      setPais(DEFAULT_PAIS)
      setProvincia(DEFAULT_PROVINCIA)
      setDepartamento('')
      setLocalidad('')
      setUbicacionExpandida(false)
      setUuidLote('')
      setMetodoPago('')
      setMoneda('ARS')
      setObservaciones('')
      setProfileImageFile(null)
      setProfileImagePreview('')
      setLocalidades([])
      setSubmitting(false)
      setVentaExistente(null)
      setDniSuggestions([])
      setShowSuggestions(false)
    }
  }, [open])

  // Autocomplete: buscar clientes mientras se escribe el DNI
  useEffect(() => {
    if (dniVerificado || dniInput.length < 3) {
      setDniSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      const { data } = await clientesService.searchClientesByDNI(dniInput, 5)
      if (data && data.length > 0) {
        setDniSuggestions(data)
        setShowSuggestions(true)
      } else {
        setDniSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [dniInput, dniVerificado])

  // Trigger search after suggestion selection updates dniInput
  useEffect(() => {
    if (pendingSearchRef.current && dniInput.length >= 3) {
      pendingSearchRef.current = false
      handleSearchDni()
    }
  }, [dniInput])

  // Aplicar lote preseleccionado al abrir (modo crear nuevo)
  useEffect(() => {
    if (open && !selectedInvitado && preselectedLoteId) {
      setUuidLote(preselectedLoteId)
    }
  }, [open, selectedInvitado, preselectedLoteId])

  // Buscar DNI
  const handleSearchDni = async () => {
    if (!dniInput.trim()) {
      toast.error('Ingresa un DNI')
      return
    }

    setCheckingDni(true)

    // Primero verificar si el DNI ya tiene un invitado en este evento (solo en modo crear)
    if (!isEditMode && selectedEvento) {
      const { existe, invitado: invExistente, error: checkError } = await invitadosService.checkDniEnEvento(dniInput.trim(), selectedEvento)
      if (checkError) {
        toast.error('Error al verificar DNI', { description: checkError.message })
        setCheckingDni(false)
        return
      }
      if (existe && invExistente) {
        setDniYaEnEvento(true)
        // Guardar datos del invitado existente para mostrar con los datos reales del evento
        setInvitadoExistente({
          ...invExistente,
          lote: lotes.find(l => l.id === invExistente.uuid_lote) || null,
          evento: eventoData ? {
            nombre: eventoData.nombre,
            estado: eventoData.estado,
            banner_url: eventoData.banner_url,
            fecha: eventoData.fecha
          } : { nombre: '', estado: true, banner_url: null, fecha: '' }
        })
        setDniVerificado(true)
        setCheckingDni(false)
        return
      }
    }

    const { data, error } = await clientesService.checkClienteByDNI(dniInput.trim())
    setCheckingDni(false)

    if (error) {
      toast.error('Error al buscar cliente', { description: error.message })
      return
    }

    setDniYaEnEvento(false)
    setDniVerificado(true)

    if (data && data.existe) {
      // DEBUG: Ver qué devuelve Supabase
      console.log('🔍 Cliente encontrado desde Supabase:', {
        pais: data.pais,
        provincia: data.provincia,
        departamento: data.departamento,
        localidad: data.localidad,
        raw: data
      })

      if (data.denegado) {
        setClienteDenegado(true)
        setClienteEncontrado(data)
        return
      }

      // Cliente existe
      setClienteEncontrado(data)
      setClienteDenegado(false)
      setNombre(data.nombre || '')
      setApellido(data.apellido || '')
      setEdad(data.edad?.toString() || '')
      setSexo((data.sexo as 'hombre' | 'mujer') || '')

      // Para país/provincia: solo usar defaults si es Argentina o no tiene país
      const clientePais = data.pais || DEFAULT_PAIS
      const esArgentina = clientePais === DEFAULT_PAIS
      setPais(clientePais)
      // Solo usar provincia por defecto si es Argentina
      setProvincia(esArgentina ? (data.provincia || DEFAULT_PROVINCIA) : (data.provincia || ''))
      setDepartamento(data.departamento || '')
      setLocalidad(data.localidad || '')

      // Si la ubicación es diferente a la por defecto, expandir
      if ((data.pais && data.pais !== DEFAULT_PAIS) ||
          (data.provincia && data.provincia !== DEFAULT_PROVINCIA)) {
        setUbicacionExpandida(true)
      }

      // Cargar localidades si hay departamento
      if (data.departamento && data.provincia) {
        const { data: locs } = await ubicacionesService.getLocalidadesByDepartamentoFull(clientePais, data.provincia, data.departamento)
        if (locs) setLocalidades(locs)
      }
    } else {
      // Cliente nuevo - limpiar formulario para cargar datos nuevos
      setClienteEncontrado(null)
      setClienteDenegado(false)
      setNombre('')
      setApellido('')
      setEdad('')
      setSexo('')
      setPais(DEFAULT_PAIS)
      setProvincia(DEFAULT_PROVINCIA)
      setDepartamento('')
      setLocalidad('')
      setUbicacionExpandida(false)
      setLocalidades([])
      setProfileImageFile(null)
      setProfileImagePreview('')
    }
  }

  // Cambiar país
  const handlePaisChange = async (value: string) => {
    setPais(value)
    setProvincia('')
    setDepartamento('')
    setLocalidad('')
    setDepartamentos([])
    setLocalidades([])

    // Cargar provincias del nuevo país
    const { data } = await ubicacionesService.getProvinciasByPais(value)
    if (data) setProvincias(data)
  }

  // Cambiar provincia
  const handleProvinciaChange = async (value: string) => {
    setProvincia(value)
    setDepartamento('')
    setLocalidad('')
    setLocalidades([])

    // Cargar departamentos de la nueva provincia
    const { data } = await ubicacionesService.getDepartamentosByProvincia(pais, value)
    if (data) setDepartamentos(data)
  }

  // Cambiar departamento
  const handleDepartamentoChange = async (value: string) => {
    setDepartamento(value)
    setLocalidad('')
    const { data } = await ubicacionesService.getLocalidadesByDepartamentoFull(pais, provincia, value)
    if (data) setLocalidades(data)
  }

  // Cambiar lote
  const handleLoteChange = (value: string) => {
    setUuidLote(value)
    setMetodoPago('')
    setMoneda('ARS')
  }

  // Cambiar imagen
  const handleImageChange = (file: File | null) => {
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setProfileImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Limpiar imagen
  const clearImage = () => {
    setProfileImageFile(null)
    setProfileImagePreview('')
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || submitting) return

    // Validaciones
    if (!sexo) {
      toast.error('Debe seleccionar el sexo')
      return
    }
    // Departamento y localidad solo obligatorios para Argentina
    if (pais === 'Argentina' && (!departamento || !localidad)) {
      toast.error('Debe seleccionar departamento y localidad')
      return
    }
    if (!uuidLote) {
      toast.error('Debe seleccionar un lote')
      return
    }
    if (selectedLoteEsVip && !profileImageFile && !profileImagePreview) {
      toast.error('La imagen de perfil es obligatoria para entradas VIP')
      return
    }
    if (requierePago && !metodoPago) {
      toast.error('Debe seleccionar un método de pago')
      return
    }

    setSubmitting(true)

    // Subir imagen si hay
    let profileImageUrl = profileImagePreview
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
        toast.error('Error al subir la imagen', { description: uploadError.message })
        setSubmitting(false)
        return
      }
      profileImageUrl = url || ''
    }

    if (isEditMode && selectedInvitado) {
      // Actualizar - incluir DNI si se cambió
      const { error } = await invitadosService.updateInvitado(selectedInvitado.id, {
        dni: dniInput.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        edad: edad ? parseInt(edad) : null,
        pais: pais || null,
        provincia: provincia || null,
        departamento: departamento.trim() || null,
        localidad: localidad.trim() || null,
        sexo: sexo as 'hombre' | 'mujer',
        uuid_lote: uuidLote || null,
        profile_image_url: profileImageUrl || null,
      })

      if (error) {
        toast.error('Error al actualizar entrada', { description: error.message })
        setSubmitting(false)
        return
      }

      // Actualizar venta si existe y cambió método de pago, moneda, monto u observaciones
      const montoActual = selectedLotePrecio
      const cambioVenta =
        ventaExistente &&
        metodoPago &&
        (ventaExistente.metodo_pago !== metodoPago ||
          ventaExistente.observaciones !== (observaciones || null) ||
          ventaExistente.moneda !== moneda ||
          ventaExistente.monto_total !== montoActual)
      if (cambioVenta && ventaExistente) {
        try {
          await ventasService.updateVenta(ventaExistente.id, {
            metodo_pago: metodoPago,
            monto_total: montoActual,
            monto_efectivo: metodoPago === 'efectivo' ? montoActual : 0,
            monto_transferencia: metodoPago === 'transferencia' ? montoActual : 0,
            moneda,
            observaciones: observaciones || undefined,
          })
        } catch {
          toast.warning('Entrada actualizada pero hubo un error al actualizar la venta')
        }
      }

      toast.success('Entrada actualizada correctamente')
      setSubmitting(false)
      onOpenChange(false)
      onSuccess()
      loadInvitados()
      loadLotes()
    } else {
      // Crear
      const { data: invitadoCreado, error } = await invitadosService.createInvitado({
        dni: dniInput.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        edad: edad ? parseInt(edad) : null,
        pais: pais || null,
        provincia: provincia || null,
        departamento: departamento.trim() || null,
        localidad: localidad.trim() || null,
        sexo: sexo as 'hombre' | 'mujer',
        uuid_evento: selectedEvento,
        uuid_lote: uuidLote,
        profile_image_url: profileImageUrl || null,
      }, user.id)

      if (error) {
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes('completo') || errorMsg.includes('full')) {
          toast.error('Lote completo', { description: error.message })
        } else {
          toast.error('Error al crear entrada', { description: error.message })
        }
        loadLotes()
        setSubmitting(false)
        return
      }

      // Crear venta si tiene precio
      if (invitadoCreado && selectedLote && selectedLotePrecio > 0 && metodoPago) {
        try {
          await ventasService.createVenta({
            uuid_invitado: invitadoCreado.id,
            uuid_evento: selectedEvento,
            uuid_lote: uuidLote,
            id_rrpp: user.id,
            metodo_pago: metodoPago,
            monto_total: selectedLotePrecio,
            monto_efectivo: metodoPago === 'efectivo' ? selectedLotePrecio : 0,
            monto_transferencia: metodoPago === 'transferencia' ? selectedLotePrecio : 0,
            moneda: moneda,
            observaciones: observaciones || undefined,
          })
          toast.success('Entrada creada y venta registrada')
        } catch {
          toast.warning('Entrada creada pero hubo un error al registrar la venta')
        }
      } else {
        toast.success('Entrada creada correctamente')
      }

      setSubmitting(false)
      onOpenChange(false)
      onSuccess()

      // Mostrar QR
      const invitadosActualizados = await loadInvitados()
      await loadLotes()

      if (invitadoCreado && onShowQR) {
        const inv = invitadosActualizados.find(i => i.id === invitadoCreado.id)
        if (inv) {
          // Inyectar datos de la venta para que el QR muestre la moneda y precio correctos
          const invConVenta: typeof inv = {
            ...inv,
            ventas: [{ moneda, monto_total: selectedLotePrecio }],
          }
          await onShowQR(invConVenta)
        }
      }
    }
  }

  // Resetear DNI para buscar otro
  const handleChangeDni = () => {
    setDniVerificado(false)
    setClienteEncontrado(null)
    setClienteDenegado(false)
    setDniYaEnEvento(false)
    setInvitadoExistente(null)
    setEditandoCliente(false)
    setNombre('')
    setApellido('')
    setEdad('')
    setSexo('')
    setPais(DEFAULT_PAIS)
    setProvincia(DEFAULT_PROVINCIA)
    setDepartamento('')
    setLocalidad('')
    setUbicacionExpandida(false)
    // Mantener el lote preseleccionado si existe, sino limpiar
    if (preselectedLoteId) {
      setUuidLote(preselectedLoteId)
    } else {
      setUuidLote('')
    }
    setMetodoPago('')
    setProfileImageFile(null)
    setProfileImagePreview('')
    setLocalidades([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full md:max-w-2xl h-screen md:h-auto m-0 md:m-4 rounded-none md:rounded-lg p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b bg-white dark:bg-slate-950 flex-shrink-0">
          <DialogTitle>{isEditMode ? 'Editar Entrada' : 'Nueva Entrada'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los datos de la entrada' : 'Ingresa el DNI para buscar o crear'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 py-4 px-4 overflow-y-auto flex-1">

            {/* Campo DNI */}
            <div className="space-y-2">
              <Label htmlFor="dni-input" className="text-base font-semibold">DNI *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="dni-input"
                    value={formatDni(dniInput)}
                    onChange={(e) => {
                      // Solo permitir números, remover cualquier otro caracter
                      const rawValue = unformatDni(e.target.value)
                      // Limitar a 9 dígitos
                      const limitedValue = rawValue.slice(0, 9)
                      setDniInput(limitedValue)
                      if (dniVerificado) handleChangeDni()
                    }}
                    placeholder="Ej: 12.345.678"
                    disabled={checkingDni}
                    className="text-lg font-bold"
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="dni-field-noautofill"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !dniVerificado) {
                        e.preventDefault()
                        setShowSuggestions(false)
                        handleSearchDni()
                      }
                    }}
                    onBlur={() => {
                      // Delay para permitir click en sugerencia
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    onFocus={() => {
                      if (dniSuggestions.length > 0 && !dniVerificado) {
                        setShowSuggestions(true)
                      }
                    }}
                  />
                  {/* Suggestions dropdown */}
                  {showSuggestions && dniSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {dniSuggestions.map((cliente) => (
                        <button
                          key={cliente.dni}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2 text-sm"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setShowSuggestions(false)
                            setDniSuggestions([])
                            pendingSearchRef.current = true
                            setDniInput(cliente.dni)
                          }}
                        >
                          <span className="font-medium truncate">{cliente.nombre} {cliente.apellido}</span>
                          <span className="text-muted-foreground shrink-0">{formatDni(cliente.dni)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!dniVerificado && (
                  <Button
                    type="button"
                    onClick={handleSearchDni}
                    disabled={checkingDni || !dniInput.trim()}
                    className="px-6"
                  >
                    {checkingDni ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {isEditMode && !dniVerificado && (
                <p className="text-xs text-muted-foreground">
                  Busca un DNI para cambiar el titular de esta entrada
                </p>
              )}
            </div>

            {/* DNI ya tiene entrada en este evento */}
            {dniYaEnEvento && invitadoExistente && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <UserCheck className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">DNI ya registrado</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Este DNI ya tiene una entrada creada para este evento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Datos del invitado existente */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border">
                  <div className="text-center">
                    <p className="text-xl font-semibold">{invitadoExistente.nombre} {invitadoExistente.apellido}</p>
                    <p className="text-sm text-muted-foreground">DNI: {invitadoExistente.dni}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span><span className="text-muted-foreground">Edad: </span><span className="font-medium">{invitadoExistente.edad || '-'} años</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span><span className="text-muted-foreground">Sexo: </span><span className="font-medium capitalize">{invitadoExistente.sexo || '-'}</span></span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span><span className="text-muted-foreground">Ubicación: </span>
                        <span className="font-medium">
                          {invitadoExistente.localidad && invitadoExistente.departamento
                            ? `${invitadoExistente.localidad}, ${invitadoExistente.departamento}`
                            : invitadoExistente.departamento || invitadoExistente.localidad || '-'}
                          {(invitadoExistente.pais && invitadoExistente.pais !== DEFAULT_PAIS) && (
                            <span className="text-muted-foreground"> ({invitadoExistente.pais})</span>
                          )}
                        </span>
                      </span>
                    </div>
                    {invitadoExistente.lote && (
                      <div className="col-span-2 flex items-center gap-2">
                        <Crown className="h-4 w-4 text-muted-foreground" />
                        <span><span className="text-muted-foreground">Lote: </span>
                          <span className="font-medium">{invitadoExistente.lote.nombre}</span>
                          {invitadoExistente.lote.es_vip && (
                            <Badge className="ml-2 bg-yellow-500 text-xs">VIP</Badge>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span><span className="text-muted-foreground">Estado: </span>
                        <span className={`font-medium ${invitadoExistente.ingresado ? 'text-green-600' : 'text-blue-600'}`}>
                          {invitadoExistente.ingresado ? 'Ya ingresó' : 'Pendiente de ingreso'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Botón para ver QR - solo si el invitado fue creado por este RRPP */}
                  {onShowQR && user && invitadoExistente.id_rrpp === user.id && (
                    <Button
                      type="button"
                      variant="default"
                      className="w-full mt-4"
                      onClick={() => {
                        onOpenChange(false)
                        onShowQR(invitadoExistente)
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Ver QR de esta entrada
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Cliente denegado */}
            {clienteDenegado && clienteEncontrado && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <X className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Ingreso Denegado</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Este cliente tiene prohibido el ingreso.
                    </p>
                    {clienteEncontrado.denegado_razon && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Razon: {clienteEncontrado.denegado_razon}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Datos del cliente existente (NO editando) */}
            {mostrarDatosCliente && clienteEncontrado && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-semibold">Cliente Encontrado</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditandoCliente(true)}
                    className="ml-auto"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border">
                  <div className="text-center">
                    <p className="text-xl font-semibold">{clienteEncontrado.nombre} {clienteEncontrado.apellido}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span><span className="text-muted-foreground">Edad: </span><span className="font-medium">{clienteEncontrado.edad || '-'} años</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span><span className="text-muted-foreground">Sexo: </span><span className="font-medium capitalize">{clienteEncontrado.sexo || '-'}</span></span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span><span className="text-muted-foreground">Ubicación: </span>
                        <span className="font-medium">
                          {clienteEncontrado.localidad && clienteEncontrado.departamento
                            ? `${clienteEncontrado.localidad}, ${clienteEncontrado.departamento}`
                            : clienteEncontrado.departamento || clienteEncontrado.localidad || '-'}
                          {(clienteEncontrado.pais && clienteEncontrado.pais !== DEFAULT_PAIS) && (
                            <span className="text-muted-foreground"> ({clienteEncontrado.pais})</span>
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario de datos (cliente nuevo o editando) */}
            {(mostrarFormulario || isEditMode) && (
              <div className="space-y-4">
                {editandoCliente && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Pencil className="h-4 w-4" />
                    <span className="text-sm font-medium">Editando datos del cliente</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditandoCliente(false)
                        // Restaurar datos originales
                        if (clienteEncontrado) {
                          setNombre(clienteEncontrado.nombre || '')
                          setApellido(clienteEncontrado.apellido || '')
                          setEdad(clienteEncontrado.edad?.toString() || '')
                          setSexo((clienteEncontrado.sexo as 'hombre' | 'mujer') || '')
                          // Solo usar defaults si es Argentina
                          const clientePais = clienteEncontrado.pais || DEFAULT_PAIS
                          const esArgentina = clientePais === DEFAULT_PAIS
                          setPais(clientePais)
                          setProvincia(esArgentina ? (clienteEncontrado.provincia || DEFAULT_PROVINCIA) : (clienteEncontrado.provincia || ''))
                          setDepartamento(clienteEncontrado.departamento || '')
                          setLocalidad(clienteEncontrado.localidad || '')
                        }
                      }}
                      className="ml-auto text-muted-foreground"
                    >
                      Cancelar edición
                    </Button>
                  </div>
                )}

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                  </div>
                </div>

                {/* Edad y Sexo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edad">Edad</Label>
                    <Input id="edad" type="number" min="1" max="100" value={edad} onChange={(e) => setEdad(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo *</Label>
                    <Select value={sexo} onValueChange={(v: 'hombre' | 'mujer') => setSexo(v)}>
                      <SelectTrigger id="sexo"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hombre">Hombre</SelectItem>
                        <SelectItem value="mujer">Mujer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ubicación - Colapsable para País/Provincia */}
                <div className="space-y-3">
                  <Collapsible open={ubicacionExpandida} onOpenChange={setUbicacionExpandida}>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between p-2 h-auto font-normal text-sm bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">País/Provincia:</span>
                          <span className="font-medium">{pais}/{provincia}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${ubicacionExpandida ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pais">País</Label>
                          <Select value={pais} onValueChange={handlePaisChange}>
                            <SelectTrigger id="pais"><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {paises.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="provincia">Provincia/Estado</Label>
                          <Select value={provincia} onValueChange={handleProvinciaChange} disabled={!pais}>
                            <SelectTrigger id="provincia"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent className="max-h-[40vh] overflow-y-auto">
                              {provincias.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Departamento y Localidad - Obligatorios solo para Argentina */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departamento">
                        Departamento {pais === 'Argentina' ? '*' : <span className="text-muted-foreground text-xs">(opcional)</span>}
                      </Label>
                      <Select value={departamento} onValueChange={handleDepartamentoChange} disabled={!provincia}>
                        <SelectTrigger id="departamento"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-y-auto">
                          {departamentos.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localidad">
                        Localidad {pais === 'Argentina' ? '*' : <span className="text-muted-foreground text-xs">(opcional)</span>}
                      </Label>
                      <Select value={localidad} onValueChange={setLocalidad} disabled={!departamento && pais === 'Argentina'}>
                        <SelectTrigger id="localidad"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-y-auto">
                          {localidades.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lote (siempre visible si DNI verificado y no denegado ni ya en evento, o en modo edición) */}
            {!dniYaEnEvento && ((dniVerificado && !clienteDenegado) || (isEditMode && !dniVerificado)) ? (
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="lote">Lote *</Label>
                  <Select value={uuidLote} onValueChange={handleLoteChange}>
                    <SelectTrigger id="lote"><SelectValue placeholder="Seleccionar lote" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {lotesDisponibles.map((lote) => {
                        const disponibles = lote.cantidad_maxima - lote.cantidad_actual
                        const porcentaje = (lote.cantidad_actual / lote.cantidad_maxima) * 100
                        const estaLleno = disponibles <= 0
                        const ultimasDisponibles = porcentaje > 50 && porcentaje <= 80
                        return (
                          <SelectItem key={lote.id} value={lote.id} disabled={estaLleno}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{lote.nombre}</span>
                              {lote.es_vip && <Crown className="h-4 w-4 text-yellow-500" />}
                              <span className="text-xs text-muted-foreground">
                                {lote.precio === 0 ? 'GRATIS' : `$${lote.precio.toFixed(2)}`}
                              </span>
                              {lote.precio_usd != null && (
                                <span className="text-xs text-blue-500">USD {lote.precio_usd.toFixed(2)}</span>
                              )}
                              {lote.precio_reales != null && (
                                <span className="text-xs text-green-600">R$ {lote.precio_reales.toFixed(2)}</span>
                              )}
                              {estaLleno && (
                                <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">SOLD OUT</span>
                              )}
                              {ultimasDisponibles && !estaLleno && (
                                <span className="text-xs text-yellow-600 font-medium">Últimas</span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de moneda (solo si el lote tiene precios alternativos) */}
                {uuidLote && selectedLote && (selectedLote.precio_usd != null || selectedLote.precio_reales != null) && (
                  <div className="space-y-2">
                    <Label htmlFor="moneda-lote">Moneda de cobro</Label>
                    <Select value={moneda} onValueChange={(v) => { setMoneda(v as TipoMoneda); setMetodoPago('') }}>
                      <SelectTrigger id="moneda-lote"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">{MONEDA_LABELS['ARS']} — ${selectedLote.precio.toFixed(2)}</SelectItem>
                        {selectedLote.precio_usd != null && (
                          <SelectItem value="USD">{MONEDA_LABELS['USD']} — USD {selectedLote.precio_usd.toFixed(2)}</SelectItem>
                        )}
                        {selectedLote.precio_reales != null && (
                          <SelectItem value="BRL">{MONEDA_LABELS['BRL']} — R$ {selectedLote.precio_reales.toFixed(2)}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : null}

            {/* Imagen VIP */}
            {selectedLoteEsVip && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Label>Imagen de Perfil VIP *</Label>
                  <Badge className="bg-yellow-500"><Crown className="h-3 w-3 mr-1" />VIP</Badge>
                </div>
                {profileImagePreview && (
                  <div className="relative w-24 h-24 mx-auto">
                    <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg border-2 border-yellow-500" />
                    <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files?.[0] || null)} />
              </div>
            )}

            {/* Pago - Mostrar si el lote requiere pago O si hay una venta existente */}
            {(requierePago || ventaExistente) && uuidLote && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Información de Pago</h4>
                  <Badge variant="outline" className="text-base font-bold">
                    {MONEDA_SIMBOLO[moneda]}{selectedLotePrecio.toFixed(2)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={metodoPago === 'efectivo' ? 'default' : 'outline'}
                      className={metodoPago === 'efectivo' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => setMetodoPago('efectivo')}
                    >
                      Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={metodoPago === 'transferencia' ? 'default' : 'outline'}
                      className={metodoPago === 'transferencia' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      onClick={() => setMetodoPago('transferencia')}
                    >
                      Transferencia
                    </Button>
                  </div>
                </div>
                {metodoPago && (
                  <div className="space-y-2">
                    <Label>Observaciones (opcional)</Label>
                    <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Ej: Transferencia a cuenta XXX" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex-shrink-0 bg-white dark:bg-slate-950 border-t p-4 mb-[30px] md:mb-0 flex flex-row gap-2 md:justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || uploadingImage} className="flex-1 md:flex-none h-12">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                uploadingImage ||
                (!isEditMode && !dniVerificado) ||
                (dniVerificado && clienteDenegado) ||
                (dniVerificado && dniYaEnEvento)
              }
              className="flex-1 md:flex-none h-12"
            >
              {uploadingImage ? 'Subiendo...' : submitting ? (isEditMode ? 'Guardando...' : 'Creando...') : (isEditMode ? 'Guardar' : 'Crear')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
