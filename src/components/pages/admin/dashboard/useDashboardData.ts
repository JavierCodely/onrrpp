import { useState, useEffect } from 'react'
import {
  analyticsService,
  type DashboardFilters,
  type DashboardStats,
  type HourlyIngresos,
  type LocationStats,
  type RRPPStats,
  type RRPPIngresoStats,
  type RRPPLocalidadStats,
  type PaisStats,
  type RRPPMesaStats
} from '@/services/analytics.service'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useDashboardData() {
  const [filters, setFilters] = useState<DashboardFilters & { eventoId?: string | 'ALL' }>({})
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [hourlyData, setHourlyData] = useState<HourlyIngresos[]>([])
  const [locationData, setLocationData] = useState<LocationStats[]>([])
  const [topLocalidadesInvitados, setTopLocalidadesInvitados] = useState<LocationStats[]>([])
  const [selectedLocalidad, setSelectedLocalidad] = useState<LocationStats | null>(null)
  const [rrppsByLocalidad, setRRPPsByLocalidad] = useState<RRPPLocalidadStats[]>([])
  const [selectedLocalidadIngreso, setSelectedLocalidadIngreso] = useState<LocationStats | null>(null)
  const [rrppsByLocalidadIngreso, setRRPPsByLocalidadIngreso] = useState<RRPPLocalidadStats[]>([])
  const [rrppData, setRRPPData] = useState<RRPPStats[]>([])
  const [selectedRRPP, setSelectedRRPP] = useState<RRPPStats | null>(null)
  const [rrppIngresoData, setRRPPIngresoData] = useState<RRPPIngresoStats[]>([])
  const [selectedRRPPIngreso, setSelectedRRPPIngreso] = useState<RRPPIngresoStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [eventos, setEventos] = useState<Array<{ id: string; nombre: string }>>([])
  const [rrpps, setRRPPs] = useState<Array<{ id: string; nombre: string; apellido: string }>>([])
  const [paises, setPaises] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [departamentos, setDepartamentos] = useState<string[]>([])

  const [paisStats, setPaisStats] = useState<PaisStats[]>([])

  const [rrppMesaData, setRRPPMesaData] = useState<RRPPMesaStats[]>([])
  const [selectedRRPPMesa, setSelectedRRPPMesa] = useState<RRPPMesaStats | null>(null)

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    if (filters.eventoId) {
      loadDashboardData()
    }
  }, [filters])

  // Realtime para actualizar dashboard cuando hay cambios en invitados
  useEffect(() => {
    console.log('📡 Configurando suscripción realtime para dashboard admin')

    const dashboardChannel = supabase
      .channel('dashboard-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitados',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime cambio en invitados (dashboard):', payload.eventType)

          const invitadoAfectado = payload.new || payload.old
          let shouldUpdate = true

          if (invitadoAfectado) {
            if (filters.eventoId && filters.eventoId !== 'ALL' && invitadoAfectado.uuid_evento !== filters.eventoId) {
              shouldUpdate = false
            }
            if (filters.rrppId && invitadoAfectado.id_rrpp !== filters.rrppId) {
              shouldUpdate = false
            }
            if (filters.sexo && invitadoAfectado.sexo !== filters.sexo) {
              shouldUpdate = false
            }
            if (filters.pais && invitadoAfectado.pais !== filters.pais) {
              shouldUpdate = false
            }
            if (filters.provincia && invitadoAfectado.provincia !== filters.provincia) {
              shouldUpdate = false
            }
            if (filters.departamento && invitadoAfectado.departamento !== filters.departamento) {
              shouldUpdate = false
            }
          }

          if (shouldUpdate) {
            console.log('📡 Recargando datos del dashboard...')
            await loadDashboardData()

            if (payload.eventType === 'INSERT') {
              toast.info('Nuevo invitado registrado', {
                description: 'Los datos se actualizaron automáticamente',
                duration: 2000,
              })
            } else if (payload.eventType === 'UPDATE' && invitadoAfectado?.ingresado) {
              toast.success('Nuevo ingreso detectado', {
                description: 'Los gráficos se actualizaron',
                duration: 2000,
              })
            } else if (payload.eventType === 'DELETE') {
              toast.info('Invitado eliminado', {
                description: 'Los datos se actualizaron',
                duration: 2000,
              })
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción dashboard:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de dashboard-analytics')
      dashboardChannel.unsubscribe()
    }
  }, [filters])

  const loadFilterOptions = async () => {
    const [eventosRes, rrppsRes, deptosRes, paisesRes] = await Promise.all([
      analyticsService.getEventos(),
      analyticsService.getRRPPs(),
      analyticsService.getDepartamentos(),
      analyticsService.getPaises(),
    ])

    if (eventosRes.data) setEventos(eventosRes.data)
    if (rrppsRes.data) setRRPPs(rrppsRes.data)
    if (deptosRes.data) setDepartamentos(deptosRes.data)
    if (paisesRes.data) setPaises(paisesRes.data)

    setLoading(false)
  }

  const loadProvincias = async (pais: string) => {
    const eventoId = filters.eventoId === 'ALL' ? undefined : filters.eventoId
    const result = await analyticsService.getProvincias(pais, eventoId)
    if (result.data) {
      setProvincias(result.data)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)

    const serviceFilters: DashboardFilters = {
      ...filters,
      eventoId: filters.eventoId === 'ALL' ? undefined : filters.eventoId
    }

    const [statsRes, hourlyRes, locationRes, topLocalidadesRes, rrppRes, rrppIngresoRes, paisStatsRes, rrppMesaRes] = await Promise.all([
      analyticsService.getDashboardStats(serviceFilters),
      analyticsService.getHourlyIngresos(serviceFilters),
      analyticsService.getLocationStats(serviceFilters, 'localidad'),
      analyticsService.getTopLocalidadesInvitados(serviceFilters),
      analyticsService.getTopRRPPs(serviceFilters),
      analyticsService.getTopRRPPsByIngreso(serviceFilters),
      analyticsService.getStatsByPais(serviceFilters),
      analyticsService.getTopRRPPsByMesas(serviceFilters),
    ])

    if (statsRes.error) {
      toast.error('Error al cargar estadísticas', {
        description: statsRes.error.message,
      })
    } else {
      setStats(statsRes.data)
    }

    if (hourlyRes.data) setHourlyData(hourlyRes.data)
    if (locationRes.data) setLocationData(locationRes.data)
    if (topLocalidadesRes.data) setTopLocalidadesInvitados(topLocalidadesRes.data)
    if (rrppRes.data) setRRPPData(rrppRes.data)
    if (rrppIngresoRes.data) setRRPPIngresoData(rrppIngresoRes.data)
    if (paisStatsRes.data) setPaisStats(paisStatsRes.data)
    if (rrppMesaRes.data) setRRPPMesaData(rrppMesaRes.data)

    setLoading(false)
  }

  const clearFilters = () => {
    setFilters({})
    setProvincias([])
  }

  const handleLocalidadClick = async (localidadData: LocationStats) => {
    setSelectedLocalidad(localidadData)

    const serviceFilters: DashboardFilters = {
      ...filters,
      eventoId: filters.eventoId === 'ALL' ? undefined : filters.eventoId
    }

    const result = await analyticsService.getRRPPsByLocalidad(localidadData.ubicacion, serviceFilters)
    if (result.data) {
      setRRPPsByLocalidad(result.data)
    }
  }

  const handleLocalidadIngresoClick = async (localidadData: LocationStats) => {
    setSelectedLocalidadIngreso(localidadData)

    const serviceFilters: DashboardFilters = {
      ...filters,
      eventoId: filters.eventoId === 'ALL' ? undefined : filters.eventoId
    }

    const result = await analyticsService.getRRPPsByLocalidadIngresados(localidadData.ubicacion, serviceFilters)
    if (result.data) {
      setRRPPsByLocalidadIngreso(result.data)
    }
  }

  const clearLocalidadSelection = () => {
    setSelectedLocalidad(null)
    setRRPPsByLocalidad([])
  }

  const clearLocalidadIngresoSelection = () => {
    setSelectedLocalidadIngreso(null)
    setRRPPsByLocalidadIngreso([])
  }

  const hasActiveFilters = Object.keys(filters).length > 0
  const hasEventoSelected = !!filters.eventoId

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    hasEventoSelected,
    eventos,
    rrpps,
    paises,
    provincias,
    departamentos,
    loadProvincias,
    stats,
    loading,
    hourlyData,
    locationData,
    topLocalidadesInvitados,
    paisStats,
    rrppData,
    rrppIngresoData,
    rrppMesaData,
    selectedLocalidad,
    rrppsByLocalidad,
    handleLocalidadClick,
    clearLocalidadSelection,
    selectedLocalidadIngreso,
    rrppsByLocalidadIngreso,
    handleLocalidadIngresoClick,
    clearLocalidadIngresoSelection,
    selectedRRPP,
    setSelectedRRPP,
    selectedRRPPIngreso,
    setSelectedRRPPIngreso,
    selectedRRPPMesa,
    setSelectedRRPPMesa,
  }
}
