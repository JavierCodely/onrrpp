import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService } from '@/services/eventos.service'
import { storageService } from '@/services/storage.service'
import { lotesService } from '@/services/lotes.service'
import {
  getSeguridadList,
  getLoteAssignments,
  assignSeguridadToLote,
  removeSeguridadFromLote,
  type SeguridadLoteAsignado
} from '@/services/lotes-seguridad.service'
import { supabase } from '@/lib/supabase'
import type { Evento, Lote } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { CreateLoteDTO, UpdateLoteDTO } from '@/services/lotes.service'
import type { GrupoType } from '@/types/database'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function useEventosData() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    fecha: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para gestión de lotes
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false)
  const [loteFormDialogOpen, setLoteFormDialogOpen] = useState(false)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [loteFormData, setLoteFormData] = useState({
    nombre: '',
    cantidad_maxima: '',
    precio: '',
    es_vip: false,
    grupo: '' as GrupoType | '' | 'TODOS',
    comision_tipo: 'monto' as 'monto' | 'porcentaje',
    comision_rrpp_monto: '',
    comision_rrpp_porcentaje: '',
  })
  const [deleteLoteDialogOpen, setDeleteLoteDialogOpen] = useState(false)

  // Estados para asignación de seguridad a lotes
  const [seguridadDialogOpen, setSeguridadDialogOpen] = useState(false)
  const [seguridadList, setSeguridadList] = useState<Array<{ id: string; nombre: string; apellido: string; activo: boolean }>>([])
  const [loteAssignments, setLoteAssignments] = useState<SeguridadLoteAsignado[]>([])
  const [loadingSeguridad, setLoadingSeguridad] = useState(false)

  useEffect(() => {
    loadEventos()

    const eventosChannel = supabase
      .channel('eventos-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eventos',
        },
        (payload: RealtimePostgresChangesPayload<Evento>) => {
          console.log('📡 Realtime UPDATE recibido en eventos:', payload)
          const eventoActualizado = payload.new as Evento

          setEventos((prevEventos) =>
            prevEventos.map((evento) =>
              evento.id === eventoActualizado.id
                ? { ...evento, total_invitados: eventoActualizado.total_invitados, total_ingresados: eventoActualizado.total_ingresados }
                : evento
            )
          )
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción eventos:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de eventos-changes')
      eventosChannel.unsubscribe()
    }
  }, [])

  const loadEventos = async () => {
    setLoading(true)
    const { data, error } = await eventosService.getEventos()
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      setEventos(data)
    }
    setLoading(false)
  }

  const handleOpenDialog = (evento?: Evento) => {
    if (evento) {
      setSelectedEvento(evento)
      const fechaLocal = new Date(evento.fecha)
      const fechaFormateada = new Date(fechaLocal.getTime() - fechaLocal.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setFormData({
        nombre: evento.nombre,
        fecha: fechaFormateada,
      })
      if (evento.banner_url) {
        setPreviewUrl(evento.banner_url)
      } else {
        setPreviewUrl(null)
      }
      setSelectedFile(null)
    } else {
      setSelectedEvento(null)
      setFormData({
        nombre: '',
        fecha: '',
      })
      setPreviewUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedEvento(null)
    setFormData({ nombre: '', fecha: '' })
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = storageService.validateImageFile(file)
    if (!validation.valid) {
      toast.error('Archivo inválido', {
        description: validation.error,
      })
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setUploading(true)

    try {
      let bannerUrl: string | null = null

      if (selectedFile) {
        if (selectedEvento) {
          const { data, error } = await storageService.updateEventBanner(
            selectedFile,
            user.club.id,
            selectedEvento.id,
            selectedEvento.banner_url
          )
          if (error) throw error
          bannerUrl = data?.url || null
        } else {
          const { data, error } = await storageService.uploadEventBanner(
            selectedFile,
            user.club.id
          )
          if (error) throw error
          bannerUrl = data?.url || null
        }
      } else if (selectedEvento) {
        bannerUrl = selectedEvento.banner_url
      }

      const eventoData = {
        nombre: formData.nombre.trim(),
        fecha: new Date(formData.fecha).toISOString(),
        banner_url: bannerUrl,
      }

      if (selectedEvento) {
        const { error } = await eventosService.updateEvento(
          selectedEvento.id,
          eventoData
        )
        if (error) throw error
        toast.success('Evento actualizado correctamente')
      } else {
        const { error } = await eventosService.createEvento(eventoData, user.id)
        if (error) throw error
        toast.success('Evento creado correctamente')
      }

      handleCloseDialog()
      loadEventos()
    } catch (error) {
      toast.error('Error al guardar evento', {
        description: (error as Error).message,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleToggleEstado = async (evento: Evento) => {
    const { error } = await eventosService.toggleEstado(evento.id, !evento.estado)
    if (error) {
      toast.error('Error al cambiar estado', {
        description: error.message,
      })
    } else {
      toast.success(
        evento.estado ? 'Evento desactivado' : 'Evento activado'
      )
      loadEventos()
    }
  }

  const handleDelete = async () => {
    if (!selectedEvento) return

    try {
      if (selectedEvento.banner_url) {
        await storageService.deleteBannerByUrl(selectedEvento.banner_url)
      }

      const { error } = await eventosService.deleteEvento(selectedEvento.id)
      if (error) throw error

      toast.success('Evento eliminado correctamente')
      setDeleteDialogOpen(false)
      setSelectedEvento(null)
      loadEventos()
    } catch (error) {
      toast.error('Error al eliminar evento', {
        description: (error as Error).message,
      })
    }
  }

  const formatFecha = (fecha: string, tipo: 'completo' | 'card' = 'completo') => {
    try {
      if (tipo === 'card') {
        const fechaFormateada = format(new Date(fecha), "EEEE d MMMM", { locale: es })
        return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)
      }
      return format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })
    } catch {
      return fecha
    }
  }

  const formatHora = (fecha: string) => {
    try {
      return format(new Date(fecha), "HH:mm", { locale: es })
    } catch {
      return ''
    }
  }

  // ==================== FUNCIONES PARA LOTES ====================

  const loadLotes = async (eventoId: string) => {
    const { data, error } = await lotesService.getLotesByEvento(eventoId)
    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  const handleOpenLotesDialog = async (evento: Evento) => {
    setSelectedEvento(evento)
    await loadLotes(evento.id)
    setLotesDialogOpen(true)
  }

  const handleCloseLotesDialog = () => {
    setLotesDialogOpen(false)
    setSelectedEvento(null)
    setLotes([])
  }

  const handleOpenLoteForm = (lote?: Lote) => {
    if (lote) {
      setSelectedLote(lote)
      setLoteFormData({
        nombre: lote.nombre,
        cantidad_maxima: lote.cantidad_maxima.toString(),
        precio: lote.precio.toString(),
        es_vip: lote.es_vip,
        grupo: lote.grupo || 'TODOS',
        comision_tipo: lote.comision_tipo,
        comision_rrpp_monto: lote.comision_rrpp_monto.toString(),
        comision_rrpp_porcentaje: lote.comision_rrpp_porcentaje.toString(),
      })
    } else {
      setSelectedLote(null)
      setLoteFormData({
        nombre: '',
        cantidad_maxima: '',
        precio: '',
        es_vip: false,
        grupo: '',
        comision_tipo: 'monto',
        comision_rrpp_monto: '',
        comision_rrpp_porcentaje: '',
      })
    }
    setLoteFormDialogOpen(true)
  }

  const handleCloseLoteForm = () => {
    setLoteFormDialogOpen(false)
    setSelectedLote(null)
    setLoteFormData({
      nombre: '',
      cantidad_maxima: '',
      precio: '',
      es_vip: false,
      grupo: '',
      comision_tipo: 'monto',
      comision_rrpp_monto: '',
      comision_rrpp_porcentaje: '',
    })
  }

  const handleSubmitLote = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedEvento) return

    const cantidadMaxima = parseInt(loteFormData.cantidad_maxima)
    const precio = parseFloat(loteFormData.precio)
    const comisionMonto = parseFloat(loteFormData.comision_rrpp_monto) || 0
    const comisionPorcentaje = parseFloat(loteFormData.comision_rrpp_porcentaje) || 0

    if (isNaN(cantidadMaxima) || cantidadMaxima <= 0) {
      toast.error('Cantidad máxima inválida')
      return
    }

    if (isNaN(precio) || precio < 0) {
      toast.error('Precio inválido')
      return
    }

    if (loteFormData.comision_tipo === 'monto') {
      if (isNaN(comisionMonto) || comisionMonto < 0) {
        toast.error('Comisión en pesos inválida')
        return
      }
    } else {
      if (isNaN(comisionPorcentaje) || comisionPorcentaje < 0 || comisionPorcentaje > 100) {
        toast.error('Comisión en porcentaje inválida (debe ser entre 0 y 100)')
        return
      }
    }

    const grupoValue = (loteFormData.grupo === 'TODOS' || !loteFormData.grupo)
      ? null
      : (loteFormData.grupo as GrupoType)

    try {
      if (selectedLote) {
        const updates: UpdateLoteDTO = {
          nombre: loteFormData.nombre.trim(),
          cantidad_maxima: cantidadMaxima,
          precio: precio,
          es_vip: loteFormData.es_vip,
          grupo: grupoValue,
          comision_tipo: loteFormData.comision_tipo,
          comision_rrpp_monto: comisionMonto,
          comision_rrpp_porcentaje: comisionPorcentaje,
        }
        const { error } = await lotesService.updateLote(selectedLote.id, updates)
        if (error) throw error
        toast.success('Lote actualizado correctamente')
      } else {
        const newLote: CreateLoteDTO = {
          nombre: loteFormData.nombre.trim(),
          cantidad_maxima: cantidadMaxima,
          precio: precio,
          es_vip: loteFormData.es_vip,
          grupo: grupoValue,
          comision_tipo: loteFormData.comision_tipo,
          comision_rrpp_monto: comisionMonto,
          comision_rrpp_porcentaje: comisionPorcentaje,
          uuid_evento: selectedEvento.id,
        }
        const { error } = await lotesService.createLote(newLote)
        if (error) throw error
        toast.success('Lote creado correctamente')
      }

      handleCloseLoteForm()
      await loadLotes(selectedEvento.id)
    } catch (error) {
      toast.error('Error al guardar lote', {
        description: (error as Error).message,
      })
    }
  }

  const handleDeleteLote = async () => {
    if (!selectedLote || !selectedEvento) return

    try {
      const { error } = await lotesService.deleteLote(selectedLote.id)
      if (error) throw error

      toast.success('Lote eliminado correctamente')
      setDeleteLoteDialogOpen(false)
      setSelectedLote(null)
      await loadLotes(selectedEvento.id)
    } catch (error) {
      toast.error('Error al eliminar lote', {
        description: (error as Error).message,
      })
    }
  }

  const handleToggleLoteActivo = async (lote: Lote) => {
    if (!selectedEvento) return

    const nuevoEstado = !lote.activo
    try {
      const { error } = await lotesService.updateLote(lote.id, { activo: nuevoEstado })
      if (error) throw error

      toast.success(
        nuevoEstado
          ? 'Lote activado - Los RRPPs pueden verlo ahora'
          : 'Lote desactivado - Los RRPPs ya no pueden verlo'
      )
      await loadLotes(selectedEvento.id)
    } catch (error) {
      toast.error('Error al cambiar estado del lote', {
        description: (error as Error).message,
      })
    }
  }

  // ==================== FUNCIONES PARA ASIGNACIÓN DE SEGURIDAD ====================

  const handleOpenSeguridadDialog = async (lote: Lote) => {
    setSelectedLote(lote)
    setLoadingSeguridad(true)
    setSeguridadDialogOpen(true)

    try {
      const [seguridadData, assignmentsData] = await Promise.all([
        getSeguridadList(),
        getLoteAssignments(lote.id)
      ])
      setSeguridadList(seguridadData)
      setLoteAssignments(assignmentsData)
    } catch (error) {
      toast.error('Error al cargar datos de seguridad')
    } finally {
      setLoadingSeguridad(false)
    }
  }

  const handleCloseSeguridadDialog = () => {
    setSeguridadDialogOpen(false)
    setSelectedLote(null)
    setSeguridadList([])
    setLoteAssignments([])
  }

  const handleAssignSeguridad = async (idSeguridad: string) => {
    if (!selectedLote) return

    try {
      const { error } = await assignSeguridadToLote(selectedLote.id, idSeguridad)
      if (error) throw error

      toast.success('Seguridad asignado correctamente')
      const assignments = await getLoteAssignments(selectedLote.id)
      setLoteAssignments(assignments)
    } catch (error) {
      toast.error('Error al asignar seguridad', {
        description: (error as Error).message,
      })
    }
  }

  const handleRemoveSeguridad = async (assignmentId: string) => {
    if (!selectedLote) return

    try {
      const { error } = await removeSeguridadFromLote(assignmentId)
      if (error) throw error

      toast.success('Seguridad removido del lote')
      const assignments = await getLoteAssignments(selectedLote.id)
      setLoteAssignments(assignments)
    } catch (error) {
      toast.error('Error al remover seguridad', {
        description: (error as Error).message,
      })
    }
  }

  const isSeguridadAssigned = (idSeguridad: string) => {
    return loteAssignments.some(a => a.id_seguridad === idSeguridad)
  }

  return {
    eventos,
    loading,
    uploading,
    dialogOpen,
    setDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedEvento,
    setSelectedEvento,
    formData,
    setFormData,
    selectedFile,
    previewUrl,
    fileInputRef,
    lotesDialogOpen,
    setLotesDialogOpen,
    loteFormDialogOpen,
    setLoteFormDialogOpen,
    lotes,
    selectedLote,
    setSelectedLote,
    loteFormData,
    setLoteFormData,
    deleteLoteDialogOpen,
    setDeleteLoteDialogOpen,
    seguridadDialogOpen,
    setSeguridadDialogOpen,
    seguridadList,
    loteAssignments,
    loadingSeguridad,
    handleOpenDialog,
    handleCloseDialog,
    handleSubmit,
    handleToggleEstado,
    handleDelete,
    handleFileSelect,
    handleRemoveImage,
    handleOpenLotesDialog,
    handleCloseLotesDialog,
    handleOpenLoteForm,
    handleCloseLoteForm,
    handleSubmitLote,
    handleDeleteLote,
    handleToggleLoteActivo,
    handleOpenSeguridadDialog,
    handleCloseSeguridadDialog,
    handleAssignSeguridad,
    handleRemoveSeguridad,
    isSeguridadAssigned,
    formatFecha,
    formatHora,
  }
}
