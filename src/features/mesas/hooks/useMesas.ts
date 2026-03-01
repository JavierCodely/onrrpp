import { useState, useEffect } from 'react'
import { mesasService } from '@/services/mesas.service'
import type { Mesa, MesaConDetalles } from '@/types/database'

export function useMesas(uuidEvento: string | null, uuidSector?: string | null) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMesas = async () => {
    if (!uuidEvento) {
      setMesas([])
      return
    }

    setLoading(true)
    setError(null)

    let result
    if (uuidSector) {
      result = await mesasService.getMesasBySector(uuidSector)
    } else {
      result = await mesasService.getMesasByEvento(uuidEvento)
    }

    if (result.error) {
      setError(result.error)
      setMesas([])
    } else {
      setMesas(result.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadMesas()
  }, [uuidEvento, uuidSector])

  useEffect(() => {
    if (!uuidEvento) return

    const channel = mesasService.subscribeToMesas(uuidEvento, () => {
      loadMesas()
    })

    return () => {
      channel.unsubscribe()
    }
  }, [uuidEvento, uuidSector])

  return {
    mesas,
    loading,
    error,
    loadMesas,
  }
}

export function useMesaConDetalles(mesaId: string | null) {
  const [mesa, setMesa] = useState<MesaConDetalles | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMesa = async () => {
    if (!mesaId) {
      setMesa(null)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await mesasService.getMesaById(mesaId) as { data: MesaConDetalles | null; error: Error | null }

    if (err) {
      setError(err)
      setMesa(null)
    } else {
      setMesa(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadMesa()
  }, [mesaId])

  return {
    mesa,
    loading,
    error,
    loadMesa,
  }
}
