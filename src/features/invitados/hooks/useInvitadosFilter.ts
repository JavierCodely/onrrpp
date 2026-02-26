import { useState, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import type { InvitadoConLote } from '@/services/invitados.service'

export function useInvitadosFilter(invitados: InvitadoConLote[]) {
  const [searchNombre, setSearchNombre] = useState('')
  const debouncedSearchNombre = useDebounce(searchNombre, 300)
  const [filterLote, setFilterLote] = useState<string>('ALL')
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'ingresados' | 'pendientes'>('ALL')

  const filteredInvitados = useMemo(() => {
    return invitados.filter((invitado) => {
      // Filtro por nombre
      const nombreCompleto = `${invitado.nombre} ${invitado.apellido}`.toLowerCase()
      const matchNombre = nombreCompleto.includes(debouncedSearchNombre.toLowerCase())

      // Filtro por lote
      const matchLote = filterLote === 'ALL' || invitado.uuid_lote === filterLote

      // Filtro por estado de ingreso
      let matchEstado = true
      if (filterEstado === 'ingresados') {
        matchEstado = invitado.ingresado === true
      } else if (filterEstado === 'pendientes') {
        matchEstado = invitado.ingresado === false
      }

      return matchNombre && matchLote && matchEstado
    })
  }, [invitados, debouncedSearchNombre, filterLote, filterEstado])

  const resetFilters = () => {
    setSearchNombre('')
    setFilterLote('ALL')
    setFilterEstado('ALL')
  }

  return {
    searchNombre,
    setSearchNombre,
    filterLote,
    setFilterLote,
    filterEstado,
    setFilterEstado,
    filteredInvitados,
    resetFilters,
  }
}
