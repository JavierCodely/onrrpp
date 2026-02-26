import { useState } from 'react'
import { clientesService, type ClienteCheckResult } from '@/services/clientes.service'
import { ubicacionesService } from '@/services/ubicaciones.service'
import type { InvitadoFormData } from '../types'
import { toast } from 'sonner'

export function useDniCheck() {
  const [dniInput, setDniInput] = useState('')
  const [checkingDni, setCheckingDni] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteCheckResult | null>(null)
  const [clienteDenegado, setClienteDenegado] = useState(false)
  const [dniVerificado, setDniVerificado] = useState(false)

  const resetDniCheck = () => {
    setDniInput('')
    setDniVerificado(false)
    setClienteEncontrado(null)
    setClienteDenegado(false)
  }

  const handleSearchDni = async (
    onSuccess: (clientData: ClienteCheckResult | null, formData: Partial<InvitadoFormData>) => void
  ) => {
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

    if (data && data.existe) {
      if (data.denegado) {
        // Cliente denegado - mostrar error
        setClienteDenegado(true)
        setClienteEncontrado(data)
        setDniVerificado(true)
        return
      }

      // Cliente existe y no está denegado
      setClienteEncontrado(data)
      setClienteDenegado(false)
      setDniVerificado(true)

      const clienteLocalidad = data.localidad || ''
      const clienteDepartamento = data.departamento || ''

      // Preparar datos del formulario
      const formDataUpdate: Partial<InvitadoFormData> = {
        dni: dniInput.trim(),
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        edad: data.edad?.toString() || '',
        departamento: clienteDepartamento,
        localidad: clienteLocalidad,
        sexo: (data.sexo as 'hombre' | 'mujer') || '',
      }

      // Cargar localidades si hay departamento
      if (clienteDepartamento) {
        const { data: localidadesData } = await ubicacionesService.getLocalidadesByDepartamento(clienteDepartamento)

        // Construir lista de localidades asegurando que la del cliente esté incluida
        let localidadesFinales: string[] = []
        if (localidadesData && localidadesData.length > 0) {
          localidadesFinales = [...localidadesData]
          // Si la localidad del cliente no está en la lista, agregarla al inicio
          if (clienteLocalidad && !localidadesData.includes(clienteLocalidad)) {
            localidadesFinales.unshift(clienteLocalidad)
          }
        } else if (clienteLocalidad) {
          localidadesFinales = [clienteLocalidad]
        }

        onSuccess(data, formDataUpdate)
        return { localidades: localidadesFinales }
      } else {
        // Sin departamento
        const localidadesFallback = clienteLocalidad ? [clienteLocalidad] : []
        onSuccess(data, formDataUpdate)
        return { localidades: localidadesFallback }
      }
    } else {
      // Cliente no existe - es nuevo, mostrar formulario vacío
      setClienteEncontrado(null)
      setClienteDenegado(false)
      setDniVerificado(true)

      const formDataUpdate: Partial<InvitadoFormData> = {
        dni: dniInput.trim(),
        nombre: '',
        apellido: '',
        edad: '',
        departamento: '',
        localidad: '',
        sexo: '',
      }

      onSuccess(null, formDataUpdate)
      return { localidades: [] }
    }
  }

  return {
    dniInput,
    setDniInput,
    checkingDni,
    clienteEncontrado,
    clienteDenegado,
    dniVerificado,
    setDniVerificado,
    setClienteEncontrado,
    setClienteDenegado,
    resetDniCheck,
    handleSearchDni,
  }
}
