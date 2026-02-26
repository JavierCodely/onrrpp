import { supabase } from '@/lib/supabase'
import type { SectorSeguridad, SectorSeguridadConDetalles } from '@/types/database'

class SectoresSeguridadService {
  private static instance: SectoresSeguridadService

  private constructor() {}

  static getInstance(): SectoresSeguridadService {
    if (!SectoresSeguridadService.instance) {
      SectoresSeguridadService.instance = new SectoresSeguridadService()
    }
    return SectoresSeguridadService.instance
  }

  async getAsignacionesBySector(uuidSector: string): Promise<{ data: SectorSeguridadConDetalles[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores_seguridad')
        .select(`
          *,
          *,
          sector:sectores(nombre, uuid_evento),
          seguridad:personal(nombre, apellido)
        `)
        .eq('uuid_sector', uuidSector)

      if (error) throw error

      // Transformar data
      const transformedData: SectorSeguridadConDetalles[] = (data || []).map((item: any) => ({
        id: item.id,
        uuid_sector: item.uuid_sector,
        id_seguridad: item.id_seguridad,
        uuid_club: item.uuid_club,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sector_nombre: item.sector.nombre,
        seguridad_nombre: item.seguridad.nombre,
        seguridad_apellido: item.seguridad.apellido,
        evento_nombre: '',
        uuid_evento: item.sector.uuid_evento,
      }))

      return { data: transformedData, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getAsignacionesByEvento(uuidEvento: string): Promise<{ data: SectorSeguridadConDetalles[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores_seguridad')
        .select(`
          *,
          *,
          sector:sectores(nombre, uuid_evento, eventos(nombre)),
          seguridad:personal(nombre, apellido)
        `)
        .eq('sector.uuid_evento', uuidEvento)

      if (error) throw error

      // Transformar data
      const transformedData: SectorSeguridadConDetalles[] = (data || []).map((item: any) => ({
        id: item.id,
        uuid_sector: item.uuid_sector,
        id_seguridad: item.id_seguridad,
        uuid_club: item.uuid_club,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sector_nombre: item.sector.nombre,
        seguridad_nombre: item.seguridad.nombre,
        seguridad_apellido: item.seguridad.apellido,
        evento_nombre: item.sector.eventos?.nombre || '',
        uuid_evento: item.sector.uuid_evento,
      }))

      return { data: transformedData, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getSeguridadesDisponibles(uuidClub: string): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('id, nombre, apellido')
        .eq('uuid_club', uuidClub)
        .eq('rol', 'seguridad')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async assignSeguridadToSector(
    uuidSector: string,
    idSeguridad: string
  ): Promise<{ data: SectorSeguridad | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores_seguridad')
        .insert({
          uuid_sector: uuidSector,
          id_seguridad: idSeguridad,
        })
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async unassignSeguridadFromSector(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('sectores_seguridad')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  subscribeToAsignaciones(uuidEvento: string, callback: () => void) {
    const channel = supabase
      .channel(`sectores-seguridad-${uuidEvento}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sectores_seguridad',
        },
        () => {
          callback()
        }
      )
      .subscribe()

    return channel
  }
}

export const sectoresSeguridadService = SectoresSeguridadService.getInstance()
