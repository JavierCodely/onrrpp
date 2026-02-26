import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'event-banners'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadResult {
  url: string
  path: string
}

export const storageService = {
  /**
   * Valida que el archivo sea una imagen y no exceda el tamaño máximo
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Formato no válido. Usa JPG, PNG o WebP',
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'El archivo es muy grande. Máximo 5MB',
      }
    }

    return { valid: true }
  },

  /**
   * Sube un banner de evento al storage
   */
  async uploadEventBanner(
    file: File,
    clubId: string,
    eventoId?: string
  ): Promise<{ data: UploadResult | null; error: Error | null }> {
    try {
      // Validar archivo
      const validation = this.validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Generar nombre único
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = eventoId
        ? `${eventoId}-${timestamp}.${fileExt}`
        : `temp-${timestamp}.${fileExt}`
      const filePath = `${clubId}/${fileName}`

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      return {
        data: {
          url: data.publicUrl,
          path: filePath,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Actualiza un banner existente (elimina el viejo y sube el nuevo)
   */
  async updateEventBanner(
    file: File,
    clubId: string,
    eventoId: string,
    oldBannerUrl?: string | null
  ): Promise<{ data: UploadResult | null; error: Error | null }> {
    try {
      // Si hay banner viejo, eliminarlo
      if (oldBannerUrl) {
        await this.deleteBannerByUrl(oldBannerUrl)
      }

      // Subir nuevo banner
      return await this.uploadEventBanner(file, clubId, eventoId)
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Elimina un banner del storage usando su URL
   */
  async deleteBannerByUrl(
    bannerUrl: string
  ): Promise<{ error: Error | null }> {
    try {
      const url = new URL(bannerUrl)
      const pathParts = url.pathname.split(`/${BUCKET_NAME}/`)

      if (pathParts.length < 2) {
        throw new Error('URL de banner inválida')
      }

      const path = pathParts[1]

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path])

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  /**
   * Elimina un banner del storage usando su path
   */
  async deleteBannerByPath(path: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path])

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  /**
   * Obtiene URL pública de un banner
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
    return data.publicUrl
  },
}
