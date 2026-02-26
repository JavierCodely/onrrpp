import { supabase } from '../lib/supabase'

export interface Ubicacion {
  id: string
  pais: string
  provincia: string
  departamento: string
  localidad: string
  created_at: string
  updated_at: string
}

export const ubicacionesService = {
  /**
   * Obtener todos los países únicos
   */
  async getPaises(): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('pais')
        .order('pais', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const paises = [...new Set(data?.map(u => u.pais) || [])]

      return { data: paises, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener provincias de un país específico
   */
  async getProvinciasByPais(pais: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('provincia')
        .eq('pais', pais)
        .order('provincia', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const provincias = [...new Set(data?.map(u => u.provincia) || [])]

      return { data: provincias, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener departamentos de una provincia específica
   */
  async getDepartamentosByProvincia(pais: string, provincia: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('departamento')
        .eq('pais', pais)
        .eq('provincia', provincia)
        .order('departamento', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const departamentos = [...new Set(data?.map(u => u.departamento) || [])]

      return { data: departamentos, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener localidades de un departamento específico (con filtro de país y provincia)
   */
  async getLocalidadesByDepartamentoFull(
    pais: string,
    provincia: string,
    departamento: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('localidad')
        .eq('pais', pais)
        .eq('provincia', provincia)
        .eq('departamento', departamento)
        .order('localidad', { ascending: true })

      if (error) throw error

      const localidades = data?.map(u => u.localidad) || []

      return { data: localidades, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener todos los departamentos únicos (legacy - for backwards compatibility)
   * This returns all departments from the default country/province (Argentina/Misiones)
   */
  async getDepartamentos(): Promise<{ data: string[] | null; error: Error | null }> {
    return this.getDepartamentosByProvincia('Argentina', 'Misiones')
  },

  /**
   * Buscar departamentos por texto (autocomplete)
   * Searches within the specified country and province, or defaults to Argentina/Misiones
   */
  async searchDepartamentos(
    searchTerm: string,
    pais: string = 'Argentina',
    provincia: string = 'Misiones'
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getDepartamentosByProvincia(pais, provincia)
      }

      const { data, error } = await supabase
        .from('ubicaciones')
        .select('departamento')
        .eq('pais', pais)
        .eq('provincia', provincia)
        .ilike('departamento', `%${searchTerm}%`)
        .order('departamento', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const departamentos = [...new Set(data?.map(u => u.departamento) || [])]

      return { data: departamentos, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener localidades de un departamento específico (legacy - for backwards compatibility)
   * Assumes Argentina/Misiones as default
   */
  async getLocalidadesByDepartamento(departamento: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('localidad')
        .eq('departamento', departamento)
        .order('localidad', { ascending: true })

      if (error) throw error

      const localidades = data?.map(u => u.localidad) || []

      return { data: localidades, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Buscar localidades por texto (autocomplete)
   * Si se proporciona departamento, filtra por ese departamento
   */
  async searchLocalidades(
    searchTerm: string,
    departamento?: string,
    pais?: string,
    provincia?: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('ubicaciones')
        .select('localidad')
        .ilike('localidad', `%${searchTerm}%`)

      if (pais) {
        query = query.eq('pais', pais)
      }
      if (provincia) {
        query = query.eq('provincia', provincia)
      }
      if (departamento) {
        query = query.eq('departamento', departamento)
      }

      const { data, error } = await query.order('localidad', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const localidades = [...new Set(data?.map(u => u.localidad) || [])]

      return { data: localidades, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener todas las ubicaciones
   */
  async getAllUbicaciones(): Promise<{ data: Ubicacion[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .order('pais', { ascending: true })
        .order('provincia', { ascending: true })
        .order('departamento', { ascending: true })
        .order('localidad', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}
