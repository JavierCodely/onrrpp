import { supabase } from '../lib/supabase'

export interface ClienteCheckResult {
  existe: boolean
  denegado: boolean
  cliente_id: string | null
  nombre: string | null
  apellido: string | null
  edad: number | null
  sexo: 'hombre' | 'mujer' | null
  pais: string | null
  provincia: string | null
  departamento: string | null
  localidad: string | null
  denegado_razon: string | null
  fecha_nacimiento?: string | null
}

export const clientesService = {
  /**
   * Verifica si un cliente existe por DNI y si está denegado
   */
  async checkClienteByDNI(dni: string): Promise<{ data: ClienteCheckResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .rpc('check_cliente_denegado', { p_dni: dni })
        .single()

      if (error) throw error

      return {
        data: data as ClienteCheckResult,
        error: null
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Busca clientes por DNI parcial (autocomplete)
   */
  async searchClientesByDNI(partialDni: string, limit = 5): Promise<{ data: Array<{ dni: string; nombre: string; apellido: string }> | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('dni, nombre, apellido')
        .like('dni', `${partialDni}%`)
        .limit(limit)

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Busca un cliente por DNI directamente en la tabla
   */
  async getClienteByDNI(dni: string): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('dni', dni)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Actualiza un cliente por ID
   */
  async updateCliente(
    clienteId: string,
    updates: { nombre?: string; apellido?: string; edad?: number | null; fecha_nacimiento?: string | null; sexo?: string; departamento?: string | null; localidad?: string | null }
  ): Promise<{ data: unknown; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', clienteId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}
