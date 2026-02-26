import { supabase } from '../lib/supabase'

export interface DashboardFilters {
  eventoId?: string
  rrppId?: string
  sexo?: 'hombre' | 'mujer'
  pais?: string
  provincia?: string
  departamento?: string
}

export interface DashboardStats {
  total_invitados: number
  total_ingresados: number
  total_invitados_mujeres: number
  total_ingresados_mujeres: number
  total_invitados_hombres: number
  total_ingresados_hombres: number
  promedio_edad_general: number
  promedio_edad_mujeres: number
  promedio_edad_hombres: number
  promedio_edad_ingresados_general: number
  promedio_edad_ingresados_mujeres: number
  promedio_edad_ingresados_hombres: number
  // Mesa stats
  total_mesas: number
  total_mesas_vendidas: number
  total_ingresados_mesas: number
  capacidad_total_mesas: number
}

export interface HourlyIngresos {
  hora: string
  cantidad: number
}

export interface LocationStats {
  ubicacion: string
  cantidad: number
}

export interface RRPPStats {
  id_rrpp: string
  nombre_rrpp: string
  total_invitados: number
  total_hombres: number
  total_mujeres: number
}

export interface RRPPIngresoStats {
  id_rrpp: string
  nombre_rrpp: string
  total_invitados: number
  total_ingresados: number
  ingresados_hombres: number
  ingresados_mujeres: number
  tasa_ingreso: number
}

export interface RRPPLocalidadStats {
  id_rrpp: string
  nombre_rrpp: string
  cantidad: number
}

export interface PaisStats {
  pais: string
  cantidad: number
}

export interface RRPPMesaStats {
  id_rrpp: string
  nombre_rrpp: string
  total_mesas: number
  capacidad_total: number
  total_ingresados: number
  tasa_ingreso: number
}

class AnalyticsService {
  /**
   * Obtener estadísticas generales con filtros
   */
  async getDashboardStats(filters: DashboardFilters = {}): Promise<{
    data: DashboardStats | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('sexo, ingresado, edad, personal!invitados_id_rrpp_fkey(activo)')
        .eq('personal.activo', true) // Solo invitados de RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Filtrar invitados con edad
      const invitadosConEdad = data?.filter(i => i.edad != null && i.edad > 0) || []
      const ingresadosConEdad = invitadosConEdad.filter(i => i.ingresado)

      // Calcular promedios de edad - TODOS los invitados
      const edadesMujeres = invitadosConEdad.filter(i => i.sexo === 'mujer').map(i => i.edad!)
      const edadesHombres = invitadosConEdad.filter(i => i.sexo === 'hombre').map(i => i.edad!)
      const edadesTodas = invitadosConEdad.map(i => i.edad!)

      // Calcular promedios de edad - INGRESADOS
      const edadesMujeresIngresadas = ingresadosConEdad.filter(i => i.sexo === 'mujer').map(i => i.edad!)
      const edadesHombresIngresados = ingresadosConEdad.filter(i => i.sexo === 'hombre').map(i => i.edad!)
      const edadesIngresadasTodas = ingresadosConEdad.map(i => i.edad!)

      const calcularPromedio = (edades: number[]) => {
        if (edades.length === 0) return 0
        return Math.round(edades.reduce((sum, edad) => sum + edad, 0) / edades.length)
      }

      // Fetch mesa stats
      let mesaQuery = supabase
        .from('mesas')
        .select('estado, max_personas, escaneos_seguridad_count')

      if (filters.eventoId) {
        mesaQuery = mesaQuery.eq('uuid_evento', filters.eventoId)
      }

      const { data: mesaData } = await mesaQuery

      const totalMesas = mesaData?.length || 0
      const totalMesasVendidas = mesaData?.filter(m => m.estado === 'vendido').length || 0
      const totalIngresadosMesas = mesaData?.reduce((sum, m) => sum + (m.escaneos_seguridad_count || 0), 0) || 0
      const capacidadTotalMesas = mesaData?.filter(m => m.estado === 'vendido').reduce((sum, m) => sum + (m.max_personas || 0), 0) || 0

      // Calcular estadísticas
      const stats: DashboardStats = {
        total_invitados: data?.length || 0,
        total_ingresados: data?.filter(i => i.ingresado).length || 0,
        total_invitados_mujeres: data?.filter(i => i.sexo === 'mujer').length || 0,
        total_ingresados_mujeres: data?.filter(i => i.sexo === 'mujer' && i.ingresado).length || 0,
        total_invitados_hombres: data?.filter(i => i.sexo === 'hombre').length || 0,
        total_ingresados_hombres: data?.filter(i => i.sexo === 'hombre' && i.ingresado).length || 0,
        promedio_edad_general: calcularPromedio(edadesTodas),
        promedio_edad_mujeres: calcularPromedio(edadesMujeres),
        promedio_edad_hombres: calcularPromedio(edadesHombres),
        promedio_edad_ingresados_general: calcularPromedio(edadesIngresadasTodas),
        promedio_edad_ingresados_mujeres: calcularPromedio(edadesMujeresIngresadas),
        promedio_edad_ingresados_hombres: calcularPromedio(edadesHombresIngresados),
        total_mesas: totalMesas,
        total_mesas_vendidas: totalMesasVendidas,
        total_ingresados_mesas: totalIngresadosMesas,
        capacidad_total_mesas: capacidadTotalMesas,
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener ingresos por hora
   */
  async getHourlyIngresos(filters: DashboardFilters = {}): Promise<{
    data: HourlyIngresos[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('fecha_ingreso, personal!invitados_id_rrpp_fkey(activo)')
        .eq('ingresado', true)
        .not('fecha_ingreso', 'is', null)
        .eq('personal.activo', true) // Solo invitados de RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por hora
      const hourlyMap = new Map<string, number>()

      data?.forEach((invitado) => {
        if (invitado.fecha_ingreso) {
          const date = new Date(invitado.fecha_ingreso)
          const hour = date.getHours().toString().padStart(2, '0') + ':00'
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
        }
      })

      // Sumar escaneos de mesas por hora
      let mesaEscaneosQuery = supabase
        .from('escaneos_mesas')
        .select('created_at, mesas!inner(uuid_evento)')
        .eq('tipo_escaneo', 'seguridad')

      if (filters.eventoId) {
        mesaEscaneosQuery = mesaEscaneosQuery.eq('mesas.uuid_evento', filters.eventoId)
      }

      const { data: mesaEscaneos } = await mesaEscaneosQuery

      mesaEscaneos?.forEach((escaneo: any) => {
        if (escaneo.created_at) {
          const date = new Date(escaneo.created_at)
          const hour = date.getHours().toString().padStart(2, '0') + ':00'
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
        }
      })

      // Convertir a array y ordenar
      const hourlyData: HourlyIngresos[] = Array.from(hourlyMap.entries())
        .map(([hora, cantidad]) => ({ hora, cantidad }))
        .sort((a, b) => a.hora.localeCompare(b.hora))

      return { data: hourlyData, error: null }
    } catch (error) {
      console.error('Error fetching hourly ingresos:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener estadísticas por ubicación (departamento o localidad)
   */
  async getLocationStats(filters: DashboardFilters = {}, groupBy: 'departamento' | 'localidad' = 'departamento'): Promise<{
    data: LocationStats[] | null
    error: Error | null
  }> {
    try {
      // Seleccionar todos los campos necesarios
      let query = supabase
        .from('invitados')
        .select('departamento, localidad, ingresado, uuid_evento, id_rrpp, sexo, personal!invitados_id_rrpp_fkey(activo)')
        .eq('ingresado', true)
        .not(groupBy, 'is', null)
        .eq('personal.activo', true) // Solo invitados de RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.departamento && groupBy === 'localidad') {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      console.log('📍 Datos de ubicación recibidos:', data?.length, 'registros')
      console.log('📍 Agrupando por:', groupBy)
      console.log('📍 Primeros 5 registros:', data?.slice(0, 5))

      // Agrupar por ubicación
      const locationMap = new Map<string, number>()

      data?.forEach((invitado: any) => {
        const location = invitado[groupBy]
        if (location) {
          locationMap.set(location, (locationMap.get(location) || 0) + 1)
        }
      })

      console.log('📍 Ubicaciones únicas encontradas:', locationMap.size)
      console.log('📍 Mapa de ubicaciones:', Array.from(locationMap.entries()))

      // Convertir a array y ordenar por cantidad descendente
      const locationData: LocationStats[] = Array.from(locationMap.entries())
        .map(([ubicacion, cantidad]) => ({ ubicacion, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10) // Top 10 ubicaciones

      console.log('📍 Datos finales para el gráfico:', locationData)

      return { data: locationData, error: null }
    } catch (error) {
      console.error('Error fetching location stats:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener TOP 5 localidades por invitados totales (no solo ingresados)
   */
  async getTopLocalidadesInvitados(filters: DashboardFilters = {}): Promise<{
    data: LocationStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('localidad, personal!invitados_id_rrpp_fkey(activo)')
        .not('localidad', 'is', null)
        .eq('personal.activo', true) // Solo invitados de RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por localidad
      const locationMap = new Map<string, number>()

      data?.forEach((invitado: any) => {
        const location = invitado.localidad
        if (location) {
          locationMap.set(location, (locationMap.get(location) || 0) + 1)
        }
      })

      // Convertir a array y ordenar por cantidad descendente
      const locationData: LocationStats[] = Array.from(locationMap.entries())
        .map(([ubicacion, cantidad]) => ({ ubicacion, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5) // Top 5 localidades

      return { data: locationData, error: null }
    } catch (error) {
      console.error('Error fetching top localidades invitados:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener lista de todos los eventos del club
   */
  async getEventos(): Promise<{
    data: Array<{ id: string; nombre: string }> | null
    error: Error | null
  }> {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('id, nombre')
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching eventos:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener lista de todos los RRPPs del club
   */
  async getRRPPs(): Promise<{
    data: Array<{ id: string; nombre: string; apellido: string }> | null
    error: Error | null
  }> {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('id, nombre, apellido')
        .eq('rol', 'rrpp')
        .eq('activo', true)
        .order('apellido')

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching RRPPs:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener departamentos únicos de invitados
   */
  async getDepartamentos(eventoId?: string): Promise<{
    data: string[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('departamento')
        .not('departamento', 'is', null)

      if (eventoId) {
        query = query.eq('uuid_evento', eventoId)
      }

      const { data, error } = await query

      if (error) throw error

      // Obtener valores únicos
      const departamentos = Array.from(new Set(data?.map(i => i.departamento).filter(Boolean)))
        .sort()

      return { data: departamentos, error: null }
    } catch (error) {
      console.error('Error fetching departamentos:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener top 10 RRPPs con más invitados y desglose por género
   */
  async getTopRRPPs(filters: DashboardFilters = {}): Promise<{
    data: RRPPStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select(`
          id_rrpp,
          sexo,
          personal!invitados_id_rrpp_fkey(nombre, apellido, activo)
        `)
        .eq('personal.activo', true) // Solo RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por RRPP
      const rrppMap = new Map<string, { nombre: string; apellido: string; hombres: number; mujeres: number }>()

      data?.forEach((invitado: any) => {
        const rrppId = invitado.id_rrpp
        const nombre = invitado.personal?.nombre || 'Sin nombre'
        const apellido = invitado.personal?.apellido || ''

        if (!rrppMap.has(rrppId)) {
          rrppMap.set(rrppId, { nombre, apellido, hombres: 0, mujeres: 0 })
        }

        const rrppData = rrppMap.get(rrppId)!
        if (invitado.sexo === 'hombre') {
          rrppData.hombres++
        } else if (invitado.sexo === 'mujer') {
          rrppData.mujeres++
        }
      })

      // Convertir a array y ordenar por total descendente
      const rrppStats: RRPPStats[] = Array.from(rrppMap.entries())
        .map(([id_rrpp, data]) => ({
          id_rrpp,
          nombre_rrpp: `${data.nombre} ${data.apellido}`.trim(),
          total_invitados: data.hombres + data.mujeres,
          total_hombres: data.hombres,
          total_mujeres: data.mujeres,
        }))
        .sort((a, b) => b.total_invitados - a.total_invitados)
        .slice(0, 10) // Top 10

      return { data: rrppStats, error: null }
    } catch (error) {
      console.error('Error fetching top RRPPs:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener top 10 RRPPs con más ingresados
   */
  async getTopRRPPsByIngreso(filters: DashboardFilters = {}): Promise<{
    data: RRPPIngresoStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select(`
          id_rrpp,
          sexo,
          ingresado,
          personal!invitados_id_rrpp_fkey(nombre, apellido, activo)
        `)
        .eq('personal.activo', true) // Solo RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por RRPP
      const rrppMap = new Map<string, {
        nombre: string
        apellido: string
        total_invitados: number
        total_ingresados: number
        ingresados_hombres: number
        ingresados_mujeres: number
      }>()

      data?.forEach((invitado: any) => {
        const rrppId = invitado.id_rrpp
        const nombre = invitado.personal?.nombre || 'Sin nombre'
        const apellido = invitado.personal?.apellido || ''

        if (!rrppMap.has(rrppId)) {
          rrppMap.set(rrppId, {
            nombre,
            apellido,
            total_invitados: 0,
            total_ingresados: 0,
            ingresados_hombres: 0,
            ingresados_mujeres: 0
          })
        }

        const rrppData = rrppMap.get(rrppId)!
        rrppData.total_invitados++

        if (invitado.ingresado) {
          rrppData.total_ingresados++
          if (invitado.sexo === 'hombre') {
            rrppData.ingresados_hombres++
          } else if (invitado.sexo === 'mujer') {
            rrppData.ingresados_mujeres++
          }
        }
      })

      // Convertir a array y ordenar por cantidad de ingresados
      const rrppIngresoStats: RRPPIngresoStats[] = Array.from(rrppMap.entries())
        .map(([id_rrpp, data]) => ({
          id_rrpp,
          nombre_rrpp: `${data.nombre} ${data.apellido}`.trim(),
          total_invitados: data.total_invitados,
          total_ingresados: data.total_ingresados,
          ingresados_hombres: data.ingresados_hombres,
          ingresados_mujeres: data.ingresados_mujeres,
          tasa_ingreso: data.total_invitados > 0
            ? (data.total_ingresados / data.total_invitados) * 100
            : 0,
        }))
        .sort((a, b) => b.total_ingresados - a.total_ingresados) // Ordenar por cantidad de ingresados
        .slice(0, 10) // Top 10

      return { data: rrppIngresoStats, error: null }
    } catch (error) {
      console.error('Error fetching top RRPPs by ingreso:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener RRPPs con invitados de una localidad específica
   */
  async getRRPPsByLocalidad(localidad: string, filters: DashboardFilters = {}): Promise<{
    data: RRPPLocalidadStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select(`
          id_rrpp,
          personal!invitados_id_rrpp_fkey(nombre, apellido, activo)
        `)
        .eq('localidad', localidad)
        .eq('personal.activo', true) // Solo RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por RRPP
      const rrppMap = new Map<string, { nombre: string; apellido: string; cantidad: number }>()

      data?.forEach((invitado: any) => {
        const rrppId = invitado.id_rrpp
        const nombre = invitado.personal?.nombre || 'Sin nombre'
        const apellido = invitado.personal?.apellido || ''

        if (!rrppMap.has(rrppId)) {
          rrppMap.set(rrppId, { nombre, apellido, cantidad: 0 })
        }

        const rrppData = rrppMap.get(rrppId)!
        rrppData.cantidad++
      })

      // Convertir a array y ordenar por cantidad descendente
      const rrppStats: RRPPLocalidadStats[] = Array.from(rrppMap.entries())
        .map(([id_rrpp, data]) => ({
          id_rrpp,
          nombre_rrpp: `${data.nombre} ${data.apellido}`.trim(),
          cantidad: data.cantidad,
        }))
        .filter(rrpp => rrpp.cantidad > 0) // Solo RRPPs con invitados de esta localidad
        .sort((a, b) => b.cantidad - a.cantidad) // Ordenar por cantidad descendente

      return { data: rrppStats, error: null }
    } catch (error) {
      console.error('Error fetching RRPPs by localidad:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener RRPPs con ingresados de una localidad específica
   */
  async getRRPPsByLocalidadIngresados(localidad: string, filters: DashboardFilters = {}): Promise<{
    data: RRPPLocalidadStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select(`
          id_rrpp,
          personal!invitados_id_rrpp_fkey(nombre, apellido, activo)
        `)
        .eq('localidad', localidad)
        .eq('ingresado', true) // Solo ingresados
        .eq('personal.activo', true) // Solo RRPPs activos

      // Aplicar filtros
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }
      if (filters.pais) {
        query = query.eq('pais', filters.pais)
      }
      if (filters.provincia) {
        query = query.eq('provincia', filters.provincia)
      }
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por RRPP
      const rrppMap = new Map<string, { nombre: string; apellido: string; cantidad: number }>()

      data?.forEach((invitado: any) => {
        const rrppId = invitado.id_rrpp
        const nombre = invitado.personal?.nombre || 'Sin nombre'
        const apellido = invitado.personal?.apellido || ''

        if (!rrppMap.has(rrppId)) {
          rrppMap.set(rrppId, { nombre, apellido, cantidad: 0 })
        }

        const rrppData = rrppMap.get(rrppId)!
        rrppData.cantidad++
      })

      // Convertir a array y ordenar por cantidad descendente
      const rrppStats: RRPPLocalidadStats[] = Array.from(rrppMap.entries())
        .map(([id_rrpp, data]) => ({
          id_rrpp,
          nombre_rrpp: `${data.nombre} ${data.apellido}`.trim(),
          cantidad: data.cantidad,
        }))
        .filter(rrpp => rrpp.cantidad > 0) // Solo RRPPs con ingresados de esta localidad
        .sort((a, b) => b.cantidad - a.cantidad) // Ordenar por cantidad descendente

      return { data: rrppStats, error: null }
    } catch (error) {
      console.error('Error fetching RRPPs by localidad ingresados:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener estadísticas por país (para gráfico de torta)
   */
  async getStatsByPais(filters: DashboardFilters = {}): Promise<{
    data: PaisStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('pais, personal!invitados_id_rrpp_fkey(activo)')
        .not('pais', 'is', null)
        .eq('personal.activo', true)

      // Aplicar filtros (excepto país, ya que agrupamos por país)
      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }
      if (filters.rrppId) {
        query = query.eq('id_rrpp', filters.rrppId)
      }
      if (filters.sexo) {
        query = query.eq('sexo', filters.sexo)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por país
      const paisMap = new Map<string, number>()

      data?.forEach((invitado: any) => {
        const pais = invitado.pais
        if (pais) {
          paisMap.set(pais, (paisMap.get(pais) || 0) + 1)
        }
      })

      // Convertir a array y ordenar por cantidad descendente
      const paisStats: PaisStats[] = Array.from(paisMap.entries())
        .map(([pais, cantidad]) => ({ pais, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)

      return { data: paisStats, error: null }
    } catch (error) {
      console.error('Error fetching stats by pais:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener lista de países con invitados
   */
  async getPaises(eventoId?: string): Promise<{
    data: string[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('pais')
        .not('pais', 'is', null)

      if (eventoId) {
        query = query.eq('uuid_evento', eventoId)
      }

      const { data, error } = await query

      if (error) throw error

      // Obtener valores únicos
      const paises = Array.from(new Set(data?.map(i => i.pais).filter(Boolean)))
        .sort()

      return { data: paises, error: null }
    } catch (error) {
      console.error('Error fetching paises:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener lista de provincias para un país específico
   */
  async getProvincias(pais: string, eventoId?: string): Promise<{
    data: string[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('invitados')
        .select('provincia')
        .eq('pais', pais)
        .not('provincia', 'is', null)

      if (eventoId) {
        query = query.eq('uuid_evento', eventoId)
      }

      const { data, error } = await query

      if (error) throw error

      // Obtener valores únicos
      const provincias = Array.from(new Set(data?.map(i => i.provincia).filter(Boolean)))
        .sort()

      return { data: provincias, error: null }
    } catch (error) {
      console.error('Error fetching provincias:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Obtener top 10 RRPPs por mesas (capacidad e ingresados)
   */
  async getTopRRPPsByMesas(filters: DashboardFilters = {}): Promise<{
    data: RRPPMesaStats[] | null
    error: Error | null
  }> {
    try {
      let query = supabase
        .from('mesas')
        .select('id_rrpp, max_personas, escaneos_seguridad_count, personal!mesas_id_rrpp_fkey(nombre, apellido)')
        .eq('estado', 'vendido')
        .not('id_rrpp', 'is', null)

      if (filters.eventoId) {
        query = query.eq('uuid_evento', filters.eventoId)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por RRPP
      const rrppMap = new Map<string, {
        nombre: string
        apellido: string
        total_mesas: number
        capacidad_total: number
        total_ingresados: number
      }>()

      data?.forEach((mesa: any) => {
        const rrppId = mesa.id_rrpp
        if (!rrppId) return
        const nombre = mesa.personal?.nombre || 'Sin nombre'
        const apellido = mesa.personal?.apellido || ''

        if (!rrppMap.has(rrppId)) {
          rrppMap.set(rrppId, { nombre, apellido, total_mesas: 0, capacidad_total: 0, total_ingresados: 0 })
        }

        const rrppData = rrppMap.get(rrppId)!
        rrppData.total_mesas++
        rrppData.capacidad_total += (mesa.max_personas || 0)
        rrppData.total_ingresados += (mesa.escaneos_seguridad_count || 0)
      })

      const rrppMesaStats: RRPPMesaStats[] = Array.from(rrppMap.entries())
        .map(([id_rrpp, d]) => ({
          id_rrpp,
          nombre_rrpp: `${d.nombre} ${d.apellido}`.trim(),
          total_mesas: d.total_mesas,
          capacidad_total: d.capacidad_total,
          total_ingresados: d.total_ingresados,
          tasa_ingreso: d.capacidad_total > 0
            ? (d.total_ingresados / d.capacidad_total) * 100
            : 0,
        }))
        .sort((a, b) => b.total_ingresados - a.total_ingresados)
        .slice(0, 10)

      return { data: rrppMesaStats, error: null }
    } catch (error) {
      console.error('Error fetching top RRPPs by mesas:', error)
      return { data: null, error: error as Error }
    }
  }
}

export const analyticsService = new AnalyticsService()
