import type { InvitadoConLote } from '@/services/invitados.service'
import type { MetodoPago, Lote } from '@/types/database'
import type { ClienteCheckResult } from '@/services/clientes.service'

export interface InvitadoFormData {
  dni: string
  nombre: string
  apellido: string
  edad: string
  departamento: string
  localidad: string
  sexo: 'hombre' | 'mujer' | ''
  uuid_lote: string
  metodo_pago: MetodoPago | ''
  monto_efectivo: string
  monto_transferencia: string
  observaciones: string
  profile_image_url: string
}

export interface DniCheckState {
  dniInput: string
  checkingDni: boolean
  clienteEncontrado: {
    existe: boolean
    nombre?: string
    apellido?: string
    edad?: number
    sexo?: string
    departamento?: string
    localidad?: string
    denegado?: boolean
    denegado_razon?: string
  } | null
  clienteDenegado: boolean
  dniVerificado: boolean
}

export interface InvitadoFilters {
  searchNombre: string
  filterLote: string
  filterEstado: 'ALL' | 'ingresados' | 'pendientes'
}

// ============================================
// FLUJO DE CREACIÓN DE INVITADO (State Machine)
// ============================================

export type InvitadoFlowStep =
  | 'DNI_INPUT'           // Paso 1: Ingreso de DNI
  | 'SEARCHING_DNI'       // Loading mientras busca
  | 'CLIENTE_DENEGADO'    // Cliente bloqueado
  | 'CLIENTE_EXISTENTE'   // Cliente encontrado - mostrar resumen
  | 'CLIENTE_NUEVO_FORM'  // Cliente nuevo - formulario completo
  | 'LOTE_SELECTION'      // Selección de lote (para cliente existente)
  | 'EDITING_CLIENTE'     // Editando datos del cliente existente

export type InvitadoFlowState =
  | { step: 'DNI_INPUT'; dniInput: string }
  | { step: 'SEARCHING_DNI'; dniInput: string }
  | { step: 'CLIENTE_DENEGADO'; cliente: ClienteCheckResult; dniInput: string }
  | { step: 'CLIENTE_EXISTENTE'; cliente: ClienteCheckResult; dniInput: string }
  | { step: 'CLIENTE_NUEVO_FORM'; dniInput: string }
  | { step: 'LOTE_SELECTION'; cliente: ClienteCheckResult; dniInput: string }
  | { step: 'EDITING_CLIENTE'; cliente: ClienteCheckResult; dniInput: string }

export type InvitadoFlowAction =
  | { type: 'SET_DNI'; dni: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_CLIENTE_EXISTENTE'; cliente: ClienteCheckResult }
  | { type: 'SEARCH_CLIENTE_NUEVO' }
  | { type: 'SEARCH_CLIENTE_DENEGADO'; cliente: ClienteCheckResult }
  | { type: 'SEARCH_ERROR' }
  | { type: 'CONTINUE_TO_LOTE' }
  | { type: 'EDIT_CLIENTE' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'SAVE_CLIENTE_EDIT'; updatedCliente: ClienteCheckResult }
  | { type: 'BACK_TO_DNI' }
  | { type: 'RESET' }

export type { InvitadoConLote, Lote, ClienteCheckResult }
