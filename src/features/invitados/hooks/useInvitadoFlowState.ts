import { useReducer, useCallback } from 'react'
import type { InvitadoFlowState, InvitadoFlowAction } from '../types'
import type { ClienteCheckResult } from '@/services/clientes.service'

const initialState: InvitadoFlowState = {
  step: 'DNI_INPUT',
  dniInput: '',
}

function flowReducer(state: InvitadoFlowState, action: InvitadoFlowAction): InvitadoFlowState {
  switch (action.type) {
    case 'SET_DNI':
      if (state.step === 'DNI_INPUT' || state.step === 'SEARCHING_DNI') {
        return { step: 'DNI_INPUT', dniInput: action.dni }
      }
      return state

    case 'SEARCH_START':
      if (state.step === 'DNI_INPUT') {
        return { step: 'SEARCHING_DNI', dniInput: state.dniInput }
      }
      return state

    case 'SEARCH_CLIENTE_EXISTENTE':
      if (state.step === 'SEARCHING_DNI') {
        return {
          step: 'CLIENTE_EXISTENTE',
          cliente: action.cliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'SEARCH_CLIENTE_NUEVO':
      if (state.step === 'SEARCHING_DNI') {
        return { step: 'CLIENTE_NUEVO_FORM', dniInput: state.dniInput }
      }
      return state

    case 'SEARCH_CLIENTE_DENEGADO':
      if (state.step === 'SEARCHING_DNI') {
        return {
          step: 'CLIENTE_DENEGADO',
          cliente: action.cliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'SEARCH_ERROR':
      if (state.step === 'SEARCHING_DNI') {
        return { step: 'DNI_INPUT', dniInput: state.dniInput }
      }
      return state

    case 'CONTINUE_TO_LOTE':
      if (state.step === 'CLIENTE_EXISTENTE') {
        return {
          step: 'LOTE_SELECTION',
          cliente: state.cliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'EDIT_CLIENTE':
      if (state.step === 'CLIENTE_EXISTENTE') {
        return {
          step: 'EDITING_CLIENTE',
          cliente: state.cliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'CANCEL_EDIT':
      if (state.step === 'EDITING_CLIENTE') {
        return {
          step: 'CLIENTE_EXISTENTE',
          cliente: state.cliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'SAVE_CLIENTE_EDIT':
      if (state.step === 'EDITING_CLIENTE') {
        return {
          step: 'CLIENTE_EXISTENTE',
          cliente: action.updatedCliente,
          dniInput: state.dniInput
        }
      }
      return state

    case 'BACK_TO_DNI':
      return { step: 'DNI_INPUT', dniInput: state.dniInput }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

export function useInvitadoFlowState(isEditMode: boolean = false) {
  const [state, dispatch] = useReducer(
    flowReducer,
    isEditMode
      ? { step: 'CLIENTE_NUEVO_FORM' as const, dniInput: '' }
      : initialState
  )

  const setDni = useCallback((dni: string) => {
    dispatch({ type: 'SET_DNI', dni })
  }, [])

  const startSearch = useCallback(() => {
    dispatch({ type: 'SEARCH_START' })
  }, [])

  const handleSearchResult = useCallback((result: ClienteCheckResult | null) => {
    if (!result || !result.existe) {
      dispatch({ type: 'SEARCH_CLIENTE_NUEVO' })
    } else if (result.denegado) {
      dispatch({ type: 'SEARCH_CLIENTE_DENEGADO', cliente: result })
    } else {
      dispatch({ type: 'SEARCH_CLIENTE_EXISTENTE', cliente: result })
    }
  }, [])

  const handleSearchError = useCallback(() => {
    dispatch({ type: 'SEARCH_ERROR' })
  }, [])

  const continueToLote = useCallback(() => {
    dispatch({ type: 'CONTINUE_TO_LOTE' })
  }, [])

  const editCliente = useCallback(() => {
    dispatch({ type: 'EDIT_CLIENTE' })
  }, [])

  const cancelEdit = useCallback(() => {
    dispatch({ type: 'CANCEL_EDIT' })
  }, [])

  const saveClienteEdit = useCallback((updatedCliente: ClienteCheckResult) => {
    dispatch({ type: 'SAVE_CLIENTE_EDIT', updatedCliente })
  }, [])

  const backToDni = useCallback(() => {
    dispatch({ type: 'BACK_TO_DNI' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    dispatch,
    // Helpers
    setDni,
    startSearch,
    handleSearchResult,
    handleSearchError,
    continueToLote,
    editCliente,
    cancelEdit,
    saveClienteEdit,
    backToDni,
    reset,
  }
}
