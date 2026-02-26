/**
 * Lotes-Seguridad Service
 *
 * Service for managing security personnel assignments to lotes (ticket batches).
 * Implements many-to-many relationship where security can only scan QR codes
 * from invitados in their assigned lotes.
 *
 * @module lotes-seguridad.service
 */

import { supabase } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export interface LoteSeguridad {
  id: string
  uuid_lote: string
  id_seguridad: string
  created_at: string
  updated_at: string
}

export interface SeguridadLoteAsignado {
  id: string
  uuid_lote: string
  id_seguridad: string
  seguridad_nombre: string
  seguridad_apellido: string
  lote_nombre: string
  lote_es_vip: boolean
  uuid_evento: string
  evento_nombre: string
  uuid_club: string
  created_at: string
  updated_at: string
}

export interface MyAssignedLote {
  uuid_lote: string
  lote_nombre: string
  lote_es_vip: boolean
  cantidad_actual: number
  cantidad_maxima: number
  uuid_evento: string
  evento_nombre: string
  evento_fecha: string
}

export interface CheckScanResult {
  success: boolean
  error?: string
  lote_nombre?: string
  invitado_id?: string
  message?: string
}

export interface MarcarIngresoResult {
  success: boolean
  error?: string
  lote_nombre?: string
  invitado_id?: string
  already_ingresado?: boolean
  message?: string
}

export interface RechazarInvitadoResult {
  success: boolean
  error?: string
  lote_nombre?: string
  invitado_id?: string
  message?: string
}

// ============================================
// Admin Functions - Manage Assignments
// ============================================

/**
 * Assign a security person to a lote
 * Only admins can perform this action
 *
 * @param uuidLote - Lote UUID
 * @param idSeguridad - Security person UUID (must have rol = 'seguridad')
 * @returns The created assignment or error
 */
export const assignSeguridadToLote = async (
  uuidLote: string,
  idSeguridad: string
): Promise<{ data: LoteSeguridad | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('lotes_seguridad')
      .insert({
        uuid_lote: uuidLote,
        id_seguridad: idSeguridad
      })
      .select()
      .single()

    if (error) {
      // Handle specific error messages from trigger
      if (error.message.includes('Solo personal con rol')) {
        throw new Error('El personal debe tener rol "seguridad"')
      }
      if (error.message.includes('mismo club')) {
        throw new Error('El seguridad y el lote deben ser del mismo club')
      }
      if (error.message.includes('duplicate key')) {
        throw new Error('Este seguridad ya está asignado a este lote')
      }
      throw new Error(error.message)
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error assigning seguridad to lote:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error desconocido')
    }
  }
}

/**
 * Remove a security person from a lote
 * Only admins can perform this action
 *
 * @param assignmentId - The lotes_seguridad record ID
 */
export const removeSeguridadFromLote = async (
  assignmentId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('lotes_seguridad')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error removing seguridad from lote:', error)
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Error desconocido')
    }
  }
}

/**
 * Get all security assignments for a specific lote
 *
 * @param uuidLote - Lote UUID
 */
export const getLoteAssignments = async (
  uuidLote: string
): Promise<SeguridadLoteAsignado[]> => {
  try {
    const { data, error } = await supabase
      .from('seguridad_lotes_asignados')
      .select('*')
      .eq('uuid_lote', uuidLote)
      .order('seguridad_apellido', { ascending: true })

    if (error) {
      console.error('Error fetching lote assignments:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching lote assignments:', error)
    return []
  }
}

/**
 * Get all security assignments for a specific event
 *
 * @param uuidEvento - Event UUID
 */
export const getEventoAssignments = async (
  uuidEvento: string
): Promise<SeguridadLoteAsignado[]> => {
  try {
    const { data, error } = await supabase
      .from('seguridad_lotes_asignados')
      .select('*')
      .eq('uuid_evento', uuidEvento)
      .order('lote_nombre', { ascending: true })
      .order('seguridad_apellido', { ascending: true })

    if (error) {
      console.error('Error fetching evento assignments:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching evento assignments:', error)
    return []
  }
}

/**
 * Get all lotes assigned to a specific security person
 *
 * @param idSeguridad - Security person UUID
 */
export const getSeguridadAssignments = async (
  idSeguridad: string
): Promise<SeguridadLoteAsignado[]> => {
  try {
    const { data, error } = await supabase
      .from('seguridad_lotes_asignados')
      .select('*')
      .eq('id_seguridad', idSeguridad)
      .order('evento_nombre', { ascending: true })
      .order('lote_nombre', { ascending: true })

    if (error) {
      console.error('Error fetching seguridad assignments:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching seguridad assignments:', error)
    return []
  }
}

// ============================================
// Security Functions - Assigned Lotes
// ============================================

/**
 * Get lotes assigned to the current security user
 * Only returns lotes from active events
 * Only callable by users with rol = 'seguridad'
 */
export const getMyAssignedLotes = async (): Promise<MyAssignedLote[]> => {
  try {
    const { data, error } = await supabase.rpc('get_my_assigned_lotes')

    if (error) {
      console.error('Error fetching my assigned lotes:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching my assigned lotes:', error)
    return []
  }
}

// ============================================
// Security Functions - QR Scanning
// ============================================

/**
 * Check if the current security user can scan a specific invitado's QR code
 * Returns detailed information about the check result
 *
 * @param qrCode - The QR code to check
 */
export const checkSeguridadCanScan = async (
  qrCode: string
): Promise<CheckScanResult> => {
  try {
    const { data, error } = await supabase.rpc('check_seguridad_can_scan', {
      p_qr_code: qrCode
    })

    if (error) {
      console.error('Error checking scan permission:', error)
      return {
        success: false,
        error: 'Error al verificar permisos de escaneo'
      }
    }

    return data as CheckScanResult
  } catch (error) {
    console.error('Error checking scan permission:', error)
    return {
      success: false,
      error: 'Error al verificar permisos de escaneo'
    }
  }
}

/**
 * Mark an invitado as ingresado (checked in) by QR code
 * Validates:
 * - User is authenticated and has rol = 'seguridad'
 * - Invitado exists and belongs to user's club
 * - Invitado is not rechazado
 * - Invitado has not already ingresado
 * - If invitado has lote, validates security is assigned to that lote
 *
 * @param qrCode - The QR code of the invitado
 */
export const marcarIngreso = async (
  qrCode: string
): Promise<MarcarIngresoResult> => {
  try {
    const { data, error } = await supabase.rpc('marcar_ingreso', {
      p_qr_code: qrCode
    })

    if (error) {
      console.error('Error marking ingreso:', error)
      return {
        success: false,
        error: 'Error al marcar ingreso'
      }
    }

    return data as MarcarIngresoResult
  } catch (error) {
    console.error('Error marking ingreso:', error)
    return {
      success: false,
      error: 'Error al marcar ingreso'
    }
  }
}

/**
 * Reject an invitado by QR code
 * Validates:
 * - User is authenticated and has rol = 'seguridad'
 * - Invitado exists and belongs to user's club
 * - If invitado has lote, validates security is assigned to that lote
 *
 * @param qrCode - The QR code of the invitado
 * @param razon - Rejection reason (enum)
 * @param detalle - Optional details (required if razon is 'otro')
 */
export const rechazarInvitado = async (
  qrCode: string,
  razon: 'codigo_vestimenta' | 'comportamiento_inadecuado' | 'otro',
  detalle?: string
): Promise<RechazarInvitadoResult> => {
  try {
    const { data, error } = await supabase.rpc('rechazar_invitado', {
      p_qr_code: qrCode,
      p_razon: razon,
      p_detalle: detalle || null
    })

    if (error) {
      console.error('Error rejecting invitado:', error)
      return {
        success: false,
        error: 'Error al rechazar invitado'
      }
    }

    return data as RechazarInvitadoResult
  } catch (error) {
    console.error('Error rejecting invitado:', error)
    return {
      success: false,
      error: 'Error al rechazar invitado'
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get list of all security personnel in current user's club
 * Useful for admin UI to select security for assignment
 */
export const getSeguridadList = async (): Promise<
  Array<{
    id: string
    nombre: string
    apellido: string
    activo: boolean
  }>
> => {
  try {
    const { data, error } = await supabase
      .from('personal')
      .select('id, nombre, apellido, activo')
      .eq('rol', 'seguridad')
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error fetching seguridad list:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching seguridad list:', error)
    return []
  }
}

/**
 * Check if a specific security person is assigned to a specific lote
 *
 * @param uuidLote - Lote UUID
 * @param idSeguridad - Security person UUID
 */
export const isSegurityAssignedToLote = async (
  uuidLote: string,
  idSeguridad: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('lotes_seguridad')
      .select('id')
      .eq('uuid_lote', uuidLote)
      .eq('id_seguridad', idSeguridad)
      .single()

    if (error) {
      return false
    }

    return !!data
  } catch (error) {
    return false
  }
}
