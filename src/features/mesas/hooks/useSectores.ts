import { useState, useEffect } from 'react'
import { sectoresService } from '@/services/sectores.service'
import type { Sector, SectorConMesas } from '@/types/database'

export function useSectores(uuidEvento: string | null) {
  const [sectores, setSectores] = useState<Sector[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadSectores = async () => {
    if (!uuidEvento) {
      setSectores([])
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await sectoresService.getSectoresByEvento(uuidEvento)

    if (err) {
      setError(err)
      setSectores([])
    } else {
      setSectores(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSectores()
  }, [uuidEvento])

  useEffect(() => {
    if (!uuidEvento) return

    const channel = sectoresService.subscribeToSectores(uuidEvento, () => {
      loadSectores()
    })

    return () => {
      channel.unsubscribe()
    }
  }, [uuidEvento])

  return {
    sectores,
    loading,
    error,
    loadSectores,
  }
}

export function useSectorConMesas(sectorId: string | null) {
  const [sector, setSector] = useState<SectorConMesas | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadSector = async () => {
    if (!sectorId) {
      setSector(null)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await sectoresService.getSectorConMesas(sectorId)

    if (err) {
      setError(err)
      setSector(null)
    } else {
      setSector(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSector()
  }, [sectorId])

  return {
    sector,
    loading,
    error,
    loadSector,
  }
}
