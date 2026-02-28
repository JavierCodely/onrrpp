import { supabase } from '../lib/supabase'

export interface ClienteAdmin {
  id: string
  dni: string
  nombre: string
  apellido: string
  denegado: boolean
  veces_ingresado: number
  ingresado_activo: boolean
}

export const clientesAdminService = {
  async getClientesAdmin(): Promise<{ data: ClienteAdmin[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('get_clientes_admin')

      if (error) throw error

      return {
        data: (data || []) as ClienteAdmin[],
        error: null,
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateClienteDenegado(id: string, denegado: boolean): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ denegado })
        .eq('id', id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}

