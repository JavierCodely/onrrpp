import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Sector, SectorConMesas } from '@/types/database'

class SectoresService {
  private static instance: SectoresService

  private constructor() {}

  static getInstance(): SectoresService {
    if (!SectoresService.instance) {
      SectoresService.instance = new SectoresService()
    }
    return SectoresService.instance
  }

  async getSectoresByEvento(uuidEvento: string): Promise<{ data: Sector[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores')
        .select('*')
        .eq('uuid_evento', uuidEvento)
        .order('nombre', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getSectorById(sectorId: string): Promise<{ data: Sector | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores')
        .select('*')
        .eq('id', sectorId)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async getSectorConMesas(sectorId: string): Promise<{ data: SectorConMesas | null; error: Error | null }> {
    try {
      const { data: sector, error: sectorError } = await supabase
        .from('sectores')
        .select('*')
        .eq('id', sectorId)
        .single()

      if (sectorError) throw sectorError

      const { data: mesas, error: mesasError } = await supabase
        .from('mesas')
        .select('*')
        .eq('uuid_sector', sectorId)
        .order('numero', { ascending: true })

      if (mesasError) throw mesasError

      const mesasArray = mesas || []
      const sectorConMesas: SectorConMesas = {
        ...sector,
        mesas: mesasArray,
        total_mesas: mesasArray.length,
        mesas_libres: mesasArray.filter(m => m.estado === 'libre').length,
        mesas_reservadas: mesasArray.filter(m => m.estado === 'reservado').length,
        mesas_vendidas: mesasArray.filter(m => m.estado === 'vendido').length,
      }

      return { data: sectorConMesas, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async createSector(
    nombre: string,
    uuidEvento: string,
    imageFile: File
  ): Promise<{ data: Sector | null; error: Error | null }> {
    try {
      // Validar dimensiones de imagen (1080x1920)
      const isValid = await this.validateImageDimensions(imageFile)
      if (!isValid) {
        throw new Error('La imagen debe ser de 1080x1920 píxeles (formato vertical)')
      }

      const user = useAuthStore.getState().user
      if (!user?.club?.id) throw new Error('No se encontró el club del usuario')

      // Subir imagen dentro de carpeta del club
      const timestamp = Date.now()
      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.club.id}/sector-${timestamp}-${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('sectores-imagenes')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: urlData } = supabase.storage
        .from('sectores-imagenes')
        .getPublicUrl(filePath)

      const imagenUrl = urlData.publicUrl

      const { data, error } = await supabase
        .from('sectores')
        .insert({
          nombre,
          imagen_url: imagenUrl,
          uuid_evento: uuidEvento,
          uuid_club: user.club.id,
        })
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async updateSector(
    sectorId: string,
    nombre: string,
    imageFile?: File
  ): Promise<{ data: Sector | null; error: Error | null }> {
    try {
      const user = useAuthStore.getState().user
      if (!user?.club?.id) throw new Error('No se encontró el club del usuario')

      let imagenUrl: string | undefined

      if (imageFile) {
        // Validar dimensiones
        const isValid = await this.validateImageDimensions(imageFile)
        if (!isValid) {
          throw new Error('La imagen debe ser de 1080x1920 píxeles (formato vertical)')
        }

        // Obtener URL anterior para eliminarla
        const { data: sectorActual } = await this.getSectorById(sectorId)
        if (sectorActual?.imagen_url) {
          const bucketBase = '/sectores-imagenes/'
          const idx = sectorActual.imagen_url.indexOf(bucketBase)
          if (idx !== -1) {
            const oldPath = sectorActual.imagen_url.substring(idx + bucketBase.length)
            await supabase.storage.from('sectores-imagenes').remove([oldPath])
          }
        }

        // Subir nueva imagen dentro de carpeta del club
        const timestamp = Date.now()
        const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${user.club.id}/sector-${timestamp}-${sanitizedName}`
        const { error: uploadError } = await supabase.storage
          .from('sectores-imagenes')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const { data: urlData } = supabase.storage
          .from('sectores-imagenes')
          .getPublicUrl(filePath)

        imagenUrl = urlData.publicUrl
      }

      // Actualizar sector
      const updateData: Partial<Sector> = { nombre }
      if (imagenUrl) {
        updateData.imagen_url = imagenUrl
      }

      const { data, error } = await supabase
        .from('sectores')
        .update(updateData)
        .eq('id', sectorId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async deleteSector(sectorId: string): Promise<{ error: Error | null }> {
    try {
      // Obtener sector para eliminar imagen
      const { data: sector } = await this.getSectorById(sectorId)

      // Eliminar sector (cascada eliminará mesas por FK)
      const { error } = await supabase
        .from('sectores')
        .delete()
        .eq('id', sectorId)

      if (error) throw error

      // Eliminar imagen del storage
      if (sector?.imagen_url) {
        const bucketBase = '/sectores-imagenes/'
        const idx = sector.imagen_url.indexOf(bucketBase)
        if (idx !== -1) {
          const oldPath = sector.imagen_url.substring(idx + bucketBase.length)
          await supabase.storage.from('sectores-imagenes').remove([oldPath])
        }
      }

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  private validateImageDimensions(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const isValid = img.width === 1080 && img.height === 1920
        resolve(isValid)
      }
      img.onerror = () => resolve(false)
      img.src = URL.createObjectURL(file)
    })
  }

  subscribeToSectores(uuidEvento: string, callback: () => void) {
    const channel = supabase
      .channel(`sectores-${uuidEvento}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sectores',
          filter: `uuid_evento=eq.${uuidEvento}`,
        },
        () => {
          callback()
        }
      )
      .subscribe()

    return channel
  }
}

export const sectoresService = SectoresService.getInstance()
