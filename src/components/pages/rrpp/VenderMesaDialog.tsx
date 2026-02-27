import { useEffect, useRef, useState } from 'react'
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
import { Search, Loader2, UserCheck, X, Pencil, ChevronDown, Globe, MapPin, Calendar, User } from 'lucide-react'
import { useMesaInteraction } from '@/features/mesas/hooks'
import { clientesService, type ClienteCheckResult } from '@/services/clientes.service'
import { ubicacionesService } from '@/services/ubicaciones.service'
import { toast } from 'sonner'
import type { Mesa } from '@/types/database'

interface VenderMesaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesa: Mesa
  onSuccess: (qrCode: string, clienteNombre: string | null) => void
}

const DEFAULT_PAIS = 'Argentina'
const DEFAULT_PROVINCIA = 'Misiones'

const formatDni = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const unformatDni = (value: string): string => {
  return value.replace(/\D/g, '')
}

export default function VenderMesaDialog({
  open,
  onOpenChange,
  mesa,
  onSuccess,
}: VenderMesaDialogProps) {
  // DNI states
  const [dniInput, setDniInput] = useState('')
  const [checkingDni, setCheckingDni] = useState(false)
  const [dniVerificado, setDniVerificado] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteCheckResult | null>(null)
  const [clienteDenegado, setClienteDenegado] = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(false)

  // Autocomplete DNI
  const [dniSuggestions, setDniSuggestions] = useState<Array<{ dni: string; nombre: string; apellido: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const pendingSearchRef = useRef(false)

  // Payment states
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'mixto'>('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoTransferencia, setMontoTransferencia] = useState('')

  // Form states
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [edad, setEdad] = useState('')
  const [sexo, setSexo] = useState<'hombre' | 'mujer' | ''>('')
  const [email, setEmail] = useState('')

  // Location states
  const [pais, setPais] = useState(DEFAULT_PAIS)
  const [provincia, setProvincia] = useState(DEFAULT_PROVINCIA)
  const [departamento, setDepartamento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [ubicacionExpandida, setUbicacionExpandida] = useState(false)

  const [paises, setPaises] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [localidades, setLocalidades] = useState<string[]>([])

  const { loading, venderMesa } = useMesaInteraction()

  const mostrarDatosCliente = dniVerificado && clienteEncontrado && !clienteDenegado && !editandoCliente
  const mostrarFormulario = dniVerificado && !clienteDenegado && (!clienteEncontrado || editandoCliente)

  // Autocomplete: buscar clientes mientras se escribe el DNI
  useEffect(() => {
    if (dniVerificado || dniInput.length < 3) {
      setDniSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (pendingSearchRef.current) {
      pendingSearchRef.current = false
      handleSearchDni()
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

  // Load countries on mount
  useEffect(() => {
    ubicacionesService.getPaises().then(({ data }) => {
      if (data) setPaises(data)
    })
  }, [])

  // Load provinces when country changes
  useEffect(() => {
    if (pais) {
      ubicacionesService.getProvinciasByPais(pais).then(({ data }) => {
        if (data) setProvincias(data)
      })
    }
  }, [pais])

  // Load departments when province changes
  useEffect(() => {
    if (pais && provincia) {
      ubicacionesService.getDepartamentosByProvincia(pais, provincia).then(({ data }) => {
        if (data) setDepartamentos(data)
      })
    }
  }, [pais, provincia])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setDniInput('')
      setCheckingDni(false)
      setDniVerificado(false)
      setClienteEncontrado(null)
      setClienteDenegado(false)
      setEditandoCliente(false)
      setDniSuggestions([])
      setShowSuggestions(false)
      setNombre('')
      setApellido('')
      setEdad('')
      setSexo('')
      setEmail('')
      setPais(DEFAULT_PAIS)
      setProvincia(DEFAULT_PROVINCIA)
      setDepartamento('')
      setLocalidad('')
      setUbicacionExpandida(false)
      setLocalidades([])
      setMetodoPago('efectivo')
      setMontoEfectivo('')
      setMontoTransferencia('')
    }
  }, [open])

  // Search DNI
  const handleSearchDni = async () => {
    if (!dniInput.trim()) {
      toast.error('Ingresa un DNI')
      return
    }

    setCheckingDni(true)
    const { data, error } = await clientesService.checkClienteByDNI(dniInput.trim())
    setCheckingDni(false)

    if (error) {
      toast.error('Error al buscar cliente', { description: error.message })
      return
    }

    setDniVerificado(true)

    if (data && data.existe) {
      if (data.denegado) {
        setClienteDenegado(true)
        setClienteEncontrado(data)
        return
      }

      setClienteEncontrado(data)
      setClienteDenegado(false)
      setNombre(data.nombre || '')
      setApellido(data.apellido || '')
      setEdad(data.edad?.toString() || '')
      setSexo((data.sexo as 'hombre' | 'mujer') || '')

      const clientePais = data.pais || DEFAULT_PAIS
      const esArgentina = clientePais === DEFAULT_PAIS
      setPais(clientePais)
      setProvincia(esArgentina ? (data.provincia || DEFAULT_PROVINCIA) : (data.provincia || ''))
      setDepartamento(data.departamento || '')
      setLocalidad(data.localidad || '')

      if ((data.pais && data.pais !== DEFAULT_PAIS) ||
          (data.provincia && data.provincia !== DEFAULT_PROVINCIA)) {
        setUbicacionExpandida(true)
      }

      if (data.departamento && data.provincia) {
        const { data: locs } = await ubicacionesService.getLocalidadesByDepartamentoFull(clientePais, data.provincia, data.departamento)
        if (locs) setLocalidades(locs)
      }
    } else {
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
    }
  }

  const handleChangeDni = () => {
    setDniVerificado(false)
    setClienteEncontrado(null)
    setClienteDenegado(false)
    setEditandoCliente(false)
    setNombre('')
    setApellido('')
    setEdad('')
    setSexo('')
    setEmail('')
    setPais(DEFAULT_PAIS)
    setProvincia(DEFAULT_PROVINCIA)
    setDepartamento('')
    setLocalidad('')
    setUbicacionExpandida(false)
    setLocalidades([])
  }

  const handlePaisChange = async (value: string) => {
    setPais(value)
    setProvincia('')
    setDepartamento('')
    setLocalidad('')
    setDepartamentos([])
    setLocalidades([])
    const { data } = await ubicacionesService.getProvinciasByPais(value)
    if (data) setProvincias(data)
  }

  const handleProvinciaChange = async (value: string) => {
    setProvincia(value)
    setDepartamento('')
    setLocalidad('')
    setLocalidades([])
    const { data } = await ubicacionesService.getDepartamentosByProvincia(pais, value)
    if (data) setDepartamentos(data)
  }

  const handleDepartamentoChange = async (value: string) => {
    setDepartamento(value)
    setLocalidad('')
    const { data } = await ubicacionesService.getLocalidadesByDepartamentoFull(pais, provincia, value)
    if (data) setLocalidades(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dniVerificado) return

    // Validate required fields for new clients
    if (!clienteEncontrado || editandoCliente) {
      if (!nombre.trim() || !apellido.trim()) {
        toast.error('Nombre y apellido son obligatorios')
        return
      }
      if (!sexo) {
        toast.error('Debe seleccionar el sexo')
        return
      }
      if (pais === 'Argentina' && (!departamento || !localidad)) {
        toast.error('Debe seleccionar departamento y localidad')
        return
      }
    }

    // Validate payment for mixto
    if (metodoPago === 'mixto') {
      const ef = Number(montoEfectivo || 0)
      const tr = Number(montoTransferencia || 0)
      if (Math.abs((ef + tr) - mesa.precio) > 0.01) {
        toast.error('Los montos de efectivo y transferencia deben sumar el precio de la mesa')
        return
      }
    }

    const clienteNombre = nombre.trim() && apellido.trim()
      ? `${nombre.trim()} ${apellido.trim()}`
      : nombre.trim() || null

    const ef = metodoPago === 'efectivo' ? mesa.precio : metodoPago === 'transferencia' ? 0 : Number(montoEfectivo || 0)
    const tr = metodoPago === 'transferencia' ? mesa.precio : metodoPago === 'efectivo' ? 0 : Number(montoTransferencia || 0)

    await venderMesa(
      mesa.id,
      dniInput.trim(),
      clienteNombre,
      email.trim() || null,
      null,
      (qrCode) => {
        onSuccess(qrCode, clienteNombre)
      },
      metodoPago,
      ef,
      tr
    )
  }

  const comisionDisplay = mesa.comision_tipo === 'porcentaje'
    ? `${mesa.comision_rrpp_porcentaje}%`
    : `$${mesa.comision_rrpp_monto}`

  const comisionCalculada = mesa.comision_tipo === 'porcentaje'
    ? (mesa.precio * mesa.comision_rrpp_porcentaje / 100)
    : mesa.comision_rrpp_monto

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full md:max-w-2xl h-screen md:h-auto m-0 md:m-4 rounded-none md:rounded-lg p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b bg-white dark:bg-slate-950 flex-shrink-0">
          <DialogTitle>Vender {mesa.nombre}</DialogTitle>
          <DialogDescription>
            Ingresa el DNI del cliente para completar la venta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 py-4 px-4 overflow-y-auto flex-1">

            {/* DNI Field */}
            <div className="space-y-2">
              <Label htmlFor="dni-mesa" className="text-base font-semibold">DNI *</Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="dni-mesa"
                    value={formatDni(dniInput)}
                    onChange={(e) => {
                      const rawValue = unformatDni(e.target.value)
                      const limitedValue = rawValue.slice(0, 9)
                      setDniInput(limitedValue)
                      if (dniVerificado) handleChangeDni()
                    }}
                    placeholder="Ej: 12.345.678"
                    disabled={checkingDni}
                    className="text-lg font-bold"
                    inputMode="numeric"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !dniVerificado) {
                        e.preventDefault()
                        handleSearchDni()
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
            </div>

            {/* Client denied */}
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

            {/* Existing client data (read-only) */}
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
                      <span><span className="text-muted-foreground">Edad: </span><span className="font-medium">{clienteEncontrado.edad || '-'} a.</span></span>
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

            {/* Form for new client or editing */}
            {mostrarFormulario && (
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
                        if (clienteEncontrado) {
                          setNombre(clienteEncontrado.nombre || '')
                          setApellido(clienteEncontrado.apellido || '')
                          setEdad(clienteEncontrado.edad?.toString() || '')
                          setSexo((clienteEncontrado.sexo as 'hombre' | 'mujer') || '')
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

                {!clienteEncontrado && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Cliente no encontrado. Completa los datos para crear el registro.
                    </p>
                  </div>
                )}

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre-mesa">Nombre *</Label>
                    <Input id="nombre-mesa" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido-mesa">Apellido *</Label>
                    <Input id="apellido-mesa" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                  </div>
                </div>

                {/* Edad y Sexo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edad-mesa">Edad</Label>
                    <Input id="edad-mesa" type="number" min="1" max="100" value={edad} onChange={(e) => setEdad(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sexo-mesa">Sexo *</Label>
                    <Select value={sexo} onValueChange={(v: 'hombre' | 'mujer') => setSexo(v)}>
                      <SelectTrigger id="sexo-mesa"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hombre">Hombre</SelectItem>
                        <SelectItem value="mujer">Mujer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ubicación */}
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
                          <Label>País</Label>
                          <Select value={pais} onValueChange={handlePaisChange}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {paises.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Provincia/Estado</Label>
                          <Select value={provincia} onValueChange={handleProvinciaChange} disabled={!pais}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent className="max-h-[40vh] overflow-y-auto">
                              {provincias.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Departamento {pais === 'Argentina' ? '*' : <span className="text-muted-foreground text-xs">(opcional)</span>}
                      </Label>
                      <Select value={departamento} onValueChange={handleDepartamentoChange} disabled={!provincia}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-y-auto">
                          {departamentos.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Localidad {pais === 'Argentina' ? '*' : <span className="text-muted-foreground text-xs">(opcional)</span>}
                      </Label>
                      <Select value={localidad} onValueChange={setLocalidad} disabled={!departamento && pais === 'Argentina'}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-y-auto">
                          {localidades.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment method */}
            {dniVerificado && !clienteDenegado && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Método de Pago *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['efectivo', 'transferencia', 'mixto'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant={metodoPago === m ? 'default' : 'outline'}
                      className={`capitalize ${metodoPago === m ? (m === 'efectivo' ? 'bg-green-600 hover:bg-green-700' : m === 'transferencia' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700') : ''}`}
                      onClick={() => {
                        setMetodoPago(m)
                        if (m === 'efectivo') {
                          setMontoEfectivo(mesa.precio.toString())
                          setMontoTransferencia('0')
                        } else if (m === 'transferencia') {
                          setMontoEfectivo('0')
                          setMontoTransferencia(mesa.precio.toString())
                        } else {
                          setMontoEfectivo('')
                          setMontoTransferencia('')
                        }
                      }}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
                {metodoPago === 'mixto' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Efectivo</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={montoEfectivo}
                        onChange={(e) => setMontoEfectivo(e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Transferencia</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={montoTransferencia}
                        onChange={(e) => setMontoTransferencia(e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    {montoEfectivo && montoTransferencia && (Number(montoEfectivo) + Number(montoTransferencia)) !== mesa.precio && (
                      <p className="col-span-2 text-xs text-red-500">
                        Los montos deben sumar ${mesa.precio.toFixed(2)} (actual: ${(Number(montoEfectivo || 0) + Number(montoTransferencia || 0)).toFixed(2)})
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sale summary */}
            {dniVerificado && !clienteDenegado && (
              <div className="bg-muted p-4 rounded-lg space-y-2 border-t">
                <h4 className="font-semibold text-sm">Resumen de venta</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-medium">${mesa.precio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comisión ({comisionDisplay}):</span>
                    <span className="font-medium">${comisionCalculada.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Máx. escaneos QR:</span>
                    <span className="font-medium">{mesa.max_personas}</span>
                  </div>
                  {mesa.tiene_consumicion && mesa.detalle_consumicion && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consumición:</span>
                      <span className="font-medium">{mesa.detalle_consumicion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex-shrink-0 bg-white dark:bg-slate-950 border-t p-4 mb-[30px] md:mb-0 flex flex-row gap-2 md:justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 md:flex-none h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !dniVerificado || clienteDenegado}
              className="flex-1 md:flex-none h-12"
            >
              {loading ? 'Procesando...' : 'Confirmar Venta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
