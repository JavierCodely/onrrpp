import { supabase } from '../lib/supabase'
import type { Invitado, InvitadoConDetalles, Lote, RazonRechazoType } from '../types/database'

export interface InvitadoConLote extends Invitado {
  lote: Lote | null
  evento: {
    nombre: string
    estado: boolean
    banner_url: string | null
    fecha: string
  }
}

export interface CreateInvitadoDTO {
  nombre: string
  apellido: string
  edad?: number | null
  pais?: string | null
  provincia?: string | null
  departamento?: string | null
  localidad?: string | null
  dni: string
  sexo: 'hombre' | 'mujer'
  uuid_evento: string
  uuid_lote?: string | null
  profile_image_url?: string | null
}

export interface UpdateInvitadoDTO {
  nombre?: string
  apellido?: string
  edad?: number | null
  pais?: string | null
  provincia?: string | null
  departamento?: string | null
  localidad?: string | null
  dni?: string
  sexo?: 'hombre' | 'mujer'
  profile_image_url?: string | null
  uuid_lote?: string | null
}

export const invitadosService = {
  /**
   * Verifica si un DNI ya tiene un invitado en un evento específico
   */
  async checkDniEnEvento(dni: string, eventoId: string): Promise<{ existe: boolean; invitado?: Invitado; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .select('*')
        .eq('dni', dni)
        .eq('uuid_evento', eventoId)
        .maybeSingle()

      if (error) throw error

      return {
        existe: !!data,
        invitado: data || undefined,
        error: null
      }
    } catch (error) {
      return { existe: false, error: error as Error }
    }
  },

  async getInvitadosByEvento(eventoId: string): Promise<{ data: Invitado[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .select('*')
        .eq('uuid_evento', eventoId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async getMyInvitados(rrppId: string, eventoId?: string): Promise<{ data: InvitadoConLote[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('invitados')
        .select(`
          *,
          lote:lotes(*),
          evento:eventos!invitados_uuid_evento_fkey(nombre, estado, banner_url, fecha)
        `)
        .eq('id_rrpp', rrppId)

      if (eventoId) {
        query = query.eq('uuid_evento', eventoId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return { data: data as InvitadoConLote[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async getInvitadoByQR(qrCode: string): Promise<{ data: InvitadoConDetalles | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .select(`
          *,
          rrpp:personal!invitados_id_rrpp_fkey(nombre, apellido),
          lote:lotes(*),
          evento:eventos!invitados_uuid_evento_fkey(nombre, estado)
        `)
        .eq('qr_code', qrCode)
        .single()

      if (error) throw error

      // Validar que el evento esté activo
      if (data && !data.evento.estado) {
        throw new Error('QR de evento inactivo')
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async createInvitado(invitado: CreateInvitadoDTO, rrppId: string): Promise<{ data: Invitado | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .insert({
          ...invitado,
          id_rrpp: rrppId,
        })
        .select()
        .single()

      if (error) {
        // Check for unique constraint violation (DNI already exists for this event)
        if (error.code === '23505' && (
          error.message.includes('invitados_dni_evento_unique') ||
          error.message.includes('dni_unico_por_evento')
        )) {
          throw new Error(`El DNI ${invitado.dni} ya tiene una entrada para este evento. No se puede registrar dos veces en el mismo evento.`)
        }
        throw error
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateInvitado(id: string, updates: UpdateInvitadoDTO): Promise<{ data: Invitado | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async deleteInvitado(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('invitados')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  async marcarIngreso(qrCode: string, resolverRechazo: boolean = false, soloVerificar: boolean = false): Promise<{
    data: {
      success: boolean
      invitado_id?: string
      lote_nombre?: string
      rechazo_resuelto?: boolean
      rechazado?: boolean
      razon_rechazo?: string
      razon_rechazo_detalle?: string
      fecha_rechazo?: string
      puede_resolver?: boolean
      lote_no_asignado?: boolean
      lote_desactivado?: boolean
      already_ingresado?: boolean
      verificacion?: boolean
      es_vip?: boolean
      error?: string
    } | null
    error: Error | null
  }> {
    try {
      const { data, error } = await supabase.rpc('marcar_ingreso', {
        p_qr_code: qrCode,
        p_resolver_rechazo: resolverRechazo,
        p_solo_verificar: soloVerificar,
      })

      if (error) throw error

      // La función RPC devuelve un objeto con el resultado
      if (data && !data.success) {
        // Si retorna success: false pero no hay error, es una validación (rechazado, lote no asignado, etc.)
        return { data, error: null }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async desmarcarIngreso(qrCode: string): Promise<{ data: Invitado | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitados')
        .update({
          ingresado: false,
          fecha_ingreso: null,
        })
        .eq('qr_code', qrCode)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async uploadProfileImage(
    file: File,
    clubId: string,
    invitadoId: string
  ): Promise<{ url: string | null; error: Error | null }> {
    try {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe superar los 5MB')
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${invitadoId}-${Date.now()}.${fileExt}`
      const filePath = `${clubId}/${fileName}`

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from('vip-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('vip-profiles')
        .getPublicUrl(filePath)

      return { url: urlData.publicUrl, error: null }
    } catch (error) {
      return { url: null, error: error as Error }
    }
  },

  async deleteProfileImage(profileImageUrl: string, clubId: string): Promise<{ error: Error | null }> {
    try {
      // Extraer el path del archivo de la URL
      const url = new URL(profileImageUrl)
      const pathParts = url.pathname.split('/vip-profiles/')
      if (pathParts.length < 2) {
        throw new Error('URL de imagen inválida')
      }
      const filePath = pathParts[1]

      // Verificar que el archivo pertenece al club del usuario
      if (!filePath.startsWith(`${clubId}/`)) {
        throw new Error('No tienes permisos para eliminar esta imagen')
      }

      const { error } = await supabase.storage
        .from('vip-profiles')
        .remove([filePath])

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  async rechazarInvitado(
    qrCode: string,
    razon: RazonRechazoType,
    detalle?: string
  ): Promise<{ data: { success: boolean; invitado_id?: string } | null; error: Error | null }> {
    try {
      // Usar la función RPC para evitar problemas de schema cache
      const { data, error } = await supabase
        .rpc('rechazar_invitado', {
          p_qr_code: qrCode,
          p_razon: razon,
          p_detalle: detalle || null
        })

      if (error) throw error

      // La función devuelve {success: boolean, error?: string, invitado_id?: uuid}
      if (data && !data.success) {
        throw new Error(data.error || 'Error al rechazar invitado')
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}
