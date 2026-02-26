# FRONTEND GUIDE - Sistema de Mesas

**Guía Completa de Implementación Frontend para el Sistema de Gestión de Mesas**

Esta guía proporciona código completo, siguiendo los patrones exactos del proyecto existente, para implementar el sistema de mesas con sectores, asignación de seguridad, ventas, y gestión de bartenders.

---

## TABLA DE CONTENIDOS

1. [Tipos TypeScript](#1-tipos-typescript)
2. [Servicios](#2-servicios)
3. [Hooks Personalizados](#3-hooks-personalizados)
4. [Componentes por Rol](#4-componentes-por-rol)
5. [Navegación y Rutas](#5-navegación-y-rutas)
6. [Componente Visual del Mapa](#6-componente-visual-del-mapa)
7. [Realtime Subscriptions](#7-realtime-subscriptions)
8. [Validaciones Frontend](#8-validaciones-frontend)
9. [shadcn/ui Componentes](#9-shadcnui-componentes)
10. [Orden de Implementación](#10-orden-de-implementación)

---

## 1. TIPOS TYPESCRIPT

### Actualizar `src/types/database.ts`

Agregar los siguientes tipos al final del archivo (antes del último `export`):

```typescript
// ============================================
// MESAS SYSTEM TYPES
// ============================================

export type EstadoMesaType = 'libre' | 'reservado' | 'vendido'
export type TipoEscaneoMesa = 'seguridad' | 'bartender'

export interface Sector {
  id: string
  nombre: string
  imagen_url: string | null
  uuid_evento: string
  uuid_club: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Mesa {
  id: string
  nombre: string
  uuid_sector: string
  uuid_evento: string
  uuid_club: string
  estado: EstadoMesaType
  precio: number
  max_personas: number
  escaneos_seguridad_count: number
  id_rrpp: string | null
  comision_tipo: ComisionTipo | null
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  tiene_consumicion: boolean
  monto_consumicion: number
  detalle_consumicion: string | null
  consumicion_entregada: boolean
  id_bartender_entrega: string | null
  fecha_entrega_consumicion: string | null
  coordenada_x: number
  coordenada_y: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface VentaMesa {
  id: string
  uuid_mesa: string
  uuid_evento: string
  uuid_club: string
  id_rrpp: string
  cliente_dni: string
  cliente_nombre: string | null
  cliente_email: string | null
  precio_venta: number
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  comision_calculada: number
  qr_code: string
  created_at: string
  updated_at: string
}

export interface EscaneoMesa {
  id: string
  uuid_mesa: string
  uuid_venta_mesa: string
  tipo_escaneo: TipoEscaneoMesa
  id_personal: string
  nombre_personal: string
  rol_personal: UserRole
  qr_code_escaneado: string
  created_at: string
}

export interface SectorSeguridad {
  id: string
  uuid_sector: string
  id_seguridad: string
  created_at: string
  updated_at: string
}

export interface SectoresSeguridad {
  id: string
  uuid_sector: string
  id_seguridad: string
  seguridad_nombre: string
  seguridad_apellido: string
  sector_nombre: string
  sector_imagen_url: string | null
  uuid_evento: string
  evento_nombre: string
  uuid_club: string
  created_at: string
  updated_at: string
}

// Extended types with joins
export interface MesaConDetalles extends Mesa {
  sector: Sector
  rrpp?: {
    nombre: string
    apellido: string
  } | null
  bartender?: {
    nombre: string
    apellido: string
  } | null
  venta?: VentaMesa | null
}

export interface VentaMesaConDetalles extends VentaMesa {
  mesa: Mesa
  sector: Sector
  evento: {
    nombre: string
  }
  rrpp: {
    nombre: string
    apellido: string
  }
}

// RPC Response Types
export interface EscanearMesaSeguridadResponse {
  success: boolean
  error?: string
  verificacion?: boolean
  mesa_nombre?: string
  sector_nombre?: string
  sector_imagen_url?: string
  coordenada_x?: number
  coordenada_y?: number
  max_personas?: number
  escaneos_actuales?: number
  cliente_dni?: string
  cliente_nombre?: string
  message?: string
}

export interface EscanearMesaBartenderResponse {
  success: boolean
  error?: string
  mostrar_confirmacion?: boolean
  mesa_nombre?: string
  detalle_consumicion?: string
  monto_consumicion?: number
  cliente_dni?: string
  cliente_nombre?: string
  fecha_entrega?: string
  bartender_nombre?: string
  message?: string
}

export interface ReservarMesaResponse {
  success: boolean
  error?: string
  mesa_id?: string
  mesa_nombre?: string
  message?: string
}

export interface VenderMesaResponse {
  success: boolean
  error?: string
  venta_id?: string
  mesa_id?: string
  mesa_nombre?: string
  qr_code?: string
  precio?: number
  message?: string
}
```

---

## 2. SERVICIOS

### 2.1. `src/services/sectores.service.ts`

```typescript
/**
 * Sectores Service
 * Manages sectors (areas) of the club with visual layouts
 */

import { supabase } from '@/lib/supabase'
import type { Sector } from '@/types/database'

export interface CreateSectorDTO {
  nombre: string
  imagen_url: string | null
  uuid_evento: string
}

export interface UpdateSectorDTO {
  nombre?: string
  imagen_url?: string | null
  activo?: boolean
}

class SectoresService {
  /**
   * Get all sectores for an event
   */
  async getSectoresByEvento(uuid_evento: string): Promise<Sector[]> {
    const { data, error } = await supabase
      .from('sectores')
      .select('*')
      .eq('uuid_evento', uuid_evento)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error fetching sectores:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get sector by ID
   */
  async getSectorById(id: string): Promise<Sector | null> {
    const { data, error } = await supabase
      .from('sectores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching sector:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Create a new sector
   */
  async createSector(sector: CreateSectorDTO): Promise<Sector> {
    const { data, error } = await supabase
      .from('sectores')
      .insert(sector)
      .select()
      .single()

    if (error) {
      console.error('Error creating sector:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Update sector
   */
  async updateSector(id: string, updates: UpdateSectorDTO): Promise<Sector> {
    const { data, error } = await supabase
      .from('sectores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating sector:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Delete sector
   */
  async deleteSector(id: string): Promise<void> {
    const { error } = await supabase
      .from('sectores')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting sector:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Upload sector layout image
   * Validates image dimensions (1080x1920)
   */
  async uploadSectorImage(
    file: File,
    clubId: string,
    sectorId?: string
  ): Promise<{ url: string; error: Error | null }> {
    try {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La imagen no debe superar los 10MB')
      }

      // Validar dimensiones 1080x1920
      const dimensions = await this.validateImageDimensions(file)
      if (dimensions.width !== 1080 || dimensions.height !== 1920) {
        throw new Error(`La imagen debe ser de 1080x1920 píxeles. Imagen actual: ${dimensions.width}x${dimensions.height}`)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = sectorId
        ? `${sectorId}-${Date.now()}.${fileExt}`
        : `temp-${Date.now()}.${fileExt}`
      const filePath = `${clubId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('sectores-imagenes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('sectores-imagenes')
        .getPublicUrl(filePath)

      return { url: urlData.publicUrl, error: null }
    } catch (error) {
      return {
        url: '',
        error: error instanceof Error ? error : new Error('Error desconocido')
      }
    }
  }

  /**
   * Validate image dimensions
   */
  private validateImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ width: img.width, height: img.height })
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('No se pudo cargar la imagen'))
      }

      img.src = objectUrl
    })
  }

  /**
   * Delete sector image from storage
   */
  async deleteSectorImage(imageUrl: string, clubId: string): Promise<{ error: Error | null }> {
    try {
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/sectores-imagenes/')
      if (pathParts.length < 2) {
        throw new Error('URL de imagen inválida')
      }
      const filePath = pathParts[1]

      if (!filePath.startsWith(`${clubId}/`)) {
        throw new Error('No tienes permisos para eliminar esta imagen')
      }

      const { error } = await supabase.storage
        .from('sectores-imagenes')
        .remove([filePath])

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }
}

export const sectoresService = new SectoresService()
```

### 2.2. `src/services/mesas.service.ts`

```typescript
/**
 * Mesas Service
 * Manages individual tables within sectors
 */

import { supabase } from '@/lib/supabase'
import type { Mesa, MesaConDetalles, EstadoMesaType, ComisionTipo } from '@/types/database'

export interface CreateMesaDTO {
  nombre: string
  uuid_sector: string
  uuid_evento: string
  precio: number
  max_personas: number
  comision_tipo: ComisionTipo | null
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  tiene_consumicion: boolean
  monto_consumicion: number
  detalle_consumicion: string | null
  coordenada_x: number
  coordenada_y: number
}

export interface UpdateMesaDTO {
  nombre?: string
  precio?: number
  max_personas?: number
  comision_tipo?: ComisionTipo | null
  comision_rrpp_monto?: number
  comision_rrpp_porcentaje?: number
  tiene_consumicion?: boolean
  monto_consumicion?: number
  detalle_consumicion?: string | null
  coordenada_x?: number
  coordenada_y?: number
  estado?: EstadoMesaType
  id_rrpp?: string | null
  activo?: boolean
}

class MesasService {
  /**
   * Get all mesas for a sector
   */
  async getMesasBySector(uuid_sector: string): Promise<MesaConDetalles[]> {
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        *,
        sector:sectores!uuid_sector(nombre, imagen_url),
        rrpp:personal!id_rrpp(nombre, apellido),
        bartender:personal!id_bartender_entrega(nombre, apellido)
      `)
      .eq('uuid_sector', uuid_sector)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error fetching mesas:', error)
      throw new Error(error.message)
    }

    return data as unknown as MesaConDetalles[]
  }

  /**
   * Get all mesas for an event
   */
  async getMesasByEvento(uuid_evento: string): Promise<MesaConDetalles[]> {
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        *,
        sector:sectores!uuid_sector(nombre, imagen_url),
        rrpp:personal!id_rrpp(nombre, apellido),
        bartender:personal!id_bartender_entrega(nombre, apellido)
      `)
      .eq('uuid_evento', uuid_evento)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error fetching mesas by evento:', error)
      throw new Error(error.message)
    }

    return data as unknown as MesaConDetalles[]
  }

  /**
   * Get mesa by ID
   */
  async getMesaById(id: string): Promise<MesaConDetalles | null> {
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        *,
        sector:sectores!uuid_sector(nombre, imagen_url),
        rrpp:personal!id_rrpp(nombre, apellido),
        bartender:personal!id_bartender_entrega(nombre, apellido),
        venta:ventas_mesas!uuid_mesa(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching mesa:', error)
      throw new Error(error.message)
    }

    return data as unknown as MesaConDetalles
  }

  /**
   * Create a new mesa
   */
  async createMesa(mesa: CreateMesaDTO): Promise<Mesa> {
    const { data, error } = await supabase
      .from('mesas')
      .insert(mesa)
      .select()
      .single()

    if (error) {
      console.error('Error creating mesa:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Update mesa
   */
  async updateMesa(id: string, updates: UpdateMesaDTO): Promise<Mesa> {
    const { data, error } = await supabase
      .from('mesas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating mesa:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Delete mesa
   */
  async deleteMesa(id: string): Promise<void> {
    const { error } = await supabase
      .from('mesas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting mesa:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Get mesas by RRPP (my reserved/sold tables)
   */
  async getMesasByRRPP(id_rrpp: string, uuid_evento?: string): Promise<MesaConDetalles[]> {
    let query = supabase
      .from('mesas')
      .select(`
        *,
        sector:sectores!uuid_sector(nombre, imagen_url),
        rrpp:personal!id_rrpp(nombre, apellido),
        venta:ventas_mesas!uuid_mesa(*)
      `)
      .eq('id_rrpp', id_rrpp)

    if (uuid_evento) {
      query = query.eq('uuid_evento', uuid_evento)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching mesas by RRPP:', error)
      throw new Error(error.message)
    }

    return data as unknown as MesaConDetalles[]
  }
}

export const mesasService = new MesasService()
```

### 2.3. `src/services/ventas-mesas.service.ts`

```typescript
/**
 * Ventas Mesas Service
 * Manages table sales and commissions
 */

import { supabase } from '@/lib/supabase'
import type { VentaMesa, VentaMesaConDetalles } from '@/types/database'

export interface CreateVentaMesaDTO {
  uuid_mesa: string
  uuid_evento: string
  id_rrpp: string
  cliente_dni: string
  cliente_nombre?: string | null
  cliente_email?: string | null
  precio_venta: number
  comision_tipo: 'monto' | 'porcentaje'
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  qr_code: string
}

export interface VentasMesasStats {
  total_ventas: number
  monto_total_vendido: number
  comision_total: number
  mesas_vendidas: number
  mesas_reservadas: number
  mesas_libres: number
}

class VentasMesasService {
  /**
   * Get all ventas_mesas for an event
   */
  async getVentasMesasByEvento(uuid_evento: string): Promise<VentaMesaConDetalles[]> {
    const { data, error } = await supabase
      .from('ventas_mesas')
      .select(`
        *,
        mesa:mesas!uuid_mesa(*),
        sector:mesas!uuid_mesa(sector:sectores!uuid_sector(nombre)),
        evento:eventos!uuid_evento(nombre),
        rrpp:personal!id_rrpp(nombre, apellido)
      `)
      .eq('uuid_evento', uuid_evento)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ventas mesas by evento:', error)
      throw new Error(error.message)
    }

    return data as unknown as VentaMesaConDetalles[]
  }

  /**
   * Get ventas_mesas by RRPP
   */
  async getVentasMesasByRRPP(id_rrpp: string, uuid_evento?: string): Promise<VentaMesaConDetalles[]> {
    let query = supabase
      .from('ventas_mesas')
      .select(`
        *,
        mesa:mesas!uuid_mesa(*),
        sector:mesas!uuid_mesa(sector:sectores!uuid_sector(nombre)),
        evento:eventos!uuid_evento(nombre),
        rrpp:personal!id_rrpp(nombre, apellido)
      `)
      .eq('id_rrpp', id_rrpp)

    if (uuid_evento) {
      query = query.eq('uuid_evento', uuid_evento)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ventas mesas by RRPP:', error)
      throw new Error(error.message)
    }

    return data as unknown as VentaMesaConDetalles[]
  }

  /**
   * Get venta_mesa by QR code
   */
  async getVentaMesaByQR(qr_code: string): Promise<VentaMesaConDetalles | null> {
    const { data, error } = await supabase
      .from('ventas_mesas')
      .select(`
        *,
        mesa:mesas!uuid_mesa(*),
        sector:mesas!uuid_mesa(sector:sectores!uuid_sector(nombre, imagen_url)),
        evento:eventos!uuid_evento(nombre),
        rrpp:personal!id_rrpp(nombre, apellido)
      `)
      .eq('qr_code', qr_code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching venta mesa by QR:', error)
      throw new Error(error.message)
    }

    return data as unknown as VentaMesaConDetalles
  }

  /**
   * Create venta mesa
   */
  async createVentaMesa(venta: CreateVentaMesaDTO): Promise<VentaMesa> {
    const { data, error } = await supabase
      .from('ventas_mesas')
      .insert(venta)
      .select()
      .single()

    if (error) {
      console.error('Error creating venta mesa:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Delete venta mesa (only if no scans)
   */
  async deleteVentaMesa(id: string): Promise<void> {
    const { error } = await supabase
      .from('ventas_mesas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting venta mesa:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Get sales statistics for an RRPP
   */
  async getVentasMesasStatsByRRPP(id_rrpp: string, uuid_evento: string): Promise<VentasMesasStats> {
    // Get ventas
    const ventas = await this.getVentasMesasByRRPP(id_rrpp, uuid_evento)

    // Get mesas counts
    const { data: mesasData } = await supabase
      .from('mesas')
      .select('estado')
      .eq('id_rrpp', id_rrpp)
      .eq('uuid_evento', uuid_evento)

    const stats: VentasMesasStats = {
      total_ventas: ventas.length,
      monto_total_vendido: ventas.reduce((sum, v) => sum + Number(v.precio_venta), 0),
      comision_total: ventas.reduce((sum, v) => sum + Number(v.comision_calculada), 0),
      mesas_vendidas: mesasData?.filter(m => m.estado === 'vendido').length || 0,
      mesas_reservadas: mesasData?.filter(m => m.estado === 'reservado').length || 0,
      mesas_libres: mesasData?.filter(m => m.estado === 'libre').length || 0,
    }

    return stats
  }
}

export const ventasMesasService = new VentasMesasService()
```

### 2.4. `src/services/escaneos-mesas.service.ts`

```typescript
/**
 * Escaneos Mesas Service
 * Manages scan history for security and bartender
 */

import { supabase } from '@/lib/supabase'
import type { EscaneoMesa, TipoEscaneoMesa } from '@/types/database'

export interface CreateEscaneoMesaDTO {
  uuid_mesa: string
  uuid_venta_mesa: string
  tipo_escaneo: TipoEscaneoMesa
  id_personal: string
  nombre_personal: string
  rol_personal: 'seguridad' | 'bartender'
  qr_code_escaneado: string
}

class EscaneosMesasService {
  /**
   * Get all escaneos for a mesa
   */
  async getEscaneosByMesa(uuid_mesa: string): Promise<EscaneoMesa[]> {
    const { data, error } = await supabase
      .from('escaneos_mesas')
      .select('*')
      .eq('uuid_mesa', uuid_mesa)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching escaneos by mesa:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get escaneos by personal (security or bartender)
   */
  async getEscaneosByPersonal(
    id_personal: string,
    tipo_escaneo?: TipoEscaneoMesa
  ): Promise<EscaneoMesa[]> {
    let query = supabase
      .from('escaneos_mesas')
      .select('*')
      .eq('id_personal', id_personal)

    if (tipo_escaneo) {
      query = query.eq('tipo_escaneo', tipo_escaneo)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching escaneos by personal:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get escaneos count for a venta_mesa
   */
  async getEscaneosCountByVenta(uuid_venta_mesa: string, tipo_escaneo?: TipoEscaneoMesa): Promise<number> {
    let query = supabase
      .from('escaneos_mesas')
      .select('id', { count: 'exact', head: true })
      .eq('uuid_venta_mesa', uuid_venta_mesa)

    if (tipo_escaneo) {
      query = query.eq('tipo_escaneo', tipo_escaneo)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error fetching escaneos count:', error)
      return 0
    }

    return count || 0
  }
}

export const escaneosMesasService = new EscaneosMesasService()
```

### 2.5. `src/services/sectores-seguridad.service.ts`

```typescript
/**
 * Sectores-Seguridad Service
 * Manages security personnel assignments to sectors
 */

import { supabase } from '@/lib/supabase'
import type { SectorSeguridad, SectoresSeguridad } from '@/types/database'

class SectoresSeguridadService {
  /**
   * Assign security to sector
   */
  async assignSeguridadToSector(uuid_sector: string, id_seguridad: string): Promise<{ data: SectorSeguridad | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('sectores_seguridad')
        .insert({ uuid_sector, id_seguridad })
        .select()
        .single()

      if (error) {
        if (error.message.includes('duplicate key')) {
          throw new Error('Este seguridad ya está asignado a este sector')
        }
        throw new Error(error.message)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  /**
   * Remove security from sector
   */
  async removeSeguridadFromSector(assignment_id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('sectores_seguridad')
        .delete()
        .eq('id', assignment_id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  /**
   * Get all security assignments for a sector
   */
  async getSeguridadBySector(uuid_sector: string): Promise<SectoresSeguridad[]> {
    const { data, error } = await supabase
      .from('seguridad_sectores_asignados')
      .select('*')
      .eq('uuid_sector', uuid_sector)
      .order('seguridad_apellido', { ascending: true })

    if (error) {
      console.error('Error fetching seguridad by sector:', error)
      return []
    }

    return data || []
  }

  /**
   * Get list of all security personnel in club
   */
  async getSeguridadList(): Promise<Array<{ id: string; nombre: string; apellido: string; activo: boolean }>> {
    const { data, error } = await supabase
      .from('personal')
      .select('id, nombre, apellido, activo')
      .eq('rol', 'seguridad')
      .order('apellido', { ascending: true })

    if (error) {
      console.error('Error fetching seguridad list:', error)
      return []
    }

    return data || []
  }

  /**
   * Get my assigned sectors (for security user)
   */
  async getMyAssignedSectores(): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_my_assigned_sectores')

    if (error) {
      console.error('Error fetching my assigned sectores:', error)
      return []
    }

    return data || []
  }

  /**
   * Bulk assign multiple security to a sector (RPC function)
   */
  async assignMultipleSeguridadToSector(
    uuid_sector: string,
    seguridad_ids: string[]
  ): Promise<{ success: boolean; assigned_count: number; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('assign_seguridad_to_sector', {
        p_uuid_sector: uuid_sector,
        p_seguridad_ids: seguridad_ids
      })

      if (error) throw error

      return {
        success: data.success,
        assigned_count: data.assigned_count,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        assigned_count: 0,
        error: error as Error
      }
    }
  }
}

export const sectoresSeguridadService = new SectoresSeguridadService()
```

### 2.6. `src/services/mesas-rpc.service.ts`

RPC Functions wrapper:

```typescript
/**
 * Mesas RPC Service
 * Wrapper for RPC functions (scan, reserve, sell)
 */

import { supabase } from '@/lib/supabase'
import type {
  EscanearMesaSeguridadResponse,
  EscanearMesaBartenderResponse,
  ReservarMesaResponse,
  VenderMesaResponse
} from '@/types/database'

class MesasRPCService {
  /**
   * Security scans QR to register entry
   */
  async escanearMesaSeguridad(
    qr_code: string,
    solo_verificar: boolean = false
  ): Promise<EscanearMesaSeguridadResponse> {
    try {
      const { data, error } = await supabase.rpc('escanear_mesa_seguridad', {
        p_qr_code: qr_code,
        p_solo_verificar: solo_verificar
      })

      if (error) throw error
      return data as EscanearMesaSeguridadResponse
    } catch (error) {
      return {
        success: false,
        error: 'Error al escanear mesa'
      }
    }
  }

  /**
   * Bartender scans QR to deliver consumicion
   */
  async escanearMesaBartender(
    qr_code: string,
    marcar_entregado: boolean = false
  ): Promise<EscanearMesaBartenderResponse> {
    try {
      const { data, error } = await supabase.rpc('escanear_mesa_bartender', {
        p_qr_code: qr_code,
        p_marcar_entregado: marcar_entregado
      })

      if (error) throw error
      return data as EscanearMesaBartenderResponse
    } catch (error) {
      return {
        success: false,
        error: 'Error al escanear mesa'
      }
    }
  }

  /**
   * RRPP reserves a mesa (blocks it temporarily)
   */
  async reservarMesa(uuid_mesa: string): Promise<ReservarMesaResponse> {
    try {
      const { data, error } = await supabase.rpc('reservar_mesa', {
        p_uuid_mesa: uuid_mesa
      })

      if (error) throw error
      return data as ReservarMesaResponse
    } catch (error) {
      return {
        success: false,
        error: 'Error al reservar mesa'
      }
    }
  }

  /**
   * RRPP releases a reserved mesa
   */
  async liberarReservaMesa(uuid_mesa: string): Promise<ReservarMesaResponse> {
    try {
      const { data, error } = await supabase.rpc('liberar_reserva_mesa', {
        p_uuid_mesa: uuid_mesa
      })

      if (error) throw error
      return data as ReservarMesaResponse
    } catch (error) {
      return {
        success: false,
        error: 'Error al liberar reserva'
      }
    }
  }

  /**
   * RRPP sells a mesa (creates venta with QR)
   */
  async venderMesa(
    uuid_mesa: string,
    cliente_dni: string,
    cliente_nombre?: string,
    cliente_email?: string,
    precio_venta?: number
  ): Promise<VenderMesaResponse> {
    try {
      const { data, error } = await supabase.rpc('vender_mesa', {
        p_uuid_mesa: uuid_mesa,
        p_cliente_dni: cliente_dni,
        p_cliente_nombre: cliente_nombre || null,
        p_cliente_email: cliente_email || null,
        p_precio_venta: precio_venta || null
      })

      if (error) throw error
      return data as VenderMesaResponse
    } catch (error) {
      return {
        success: false,
        error: 'Error al vender mesa'
      }
    }
  }
}

export const mesasRPCService = new MesasRPCService()
```

---

## 3. HOOKS PERSONALIZADOS

### 3.1. `src/features/mesas/hooks/useSectores.ts`

```typescript
import { useState, useEffect } from 'react'
import { sectoresService } from '@/services/sectores.service'
import { supabase } from '@/lib/supabase'
import type { Sector } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useSectores(eventoId: string | null) {
  const [sectores, setSectores] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)

  const loadSectores = async () => {
    if (!eventoId) {
      setSectores([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await sectoresService.getSectoresByEvento(eventoId)
      setSectores(data)
    } catch (error) {
      console.error('Error loading sectores:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSectores()
  }, [eventoId])

  // Realtime subscription
  useEffect(() => {
    if (!eventoId) return

    const channel = supabase
      .channel(`sectores-${eventoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sectores',
          filter: `uuid_evento=eq.${eventoId}`
        },
        (payload: RealtimePostgresChangesPayload<Sector>) => {
          console.log('📡 Realtime: sectores change', payload)
          loadSectores()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventoId])

  return { sectores, loading, loadSectores }
}
```

### 3.2. `src/features/mesas/hooks/useMesas.ts`

```typescript
import { useState, useEffect } from 'react'
import { mesasService } from '@/services/mesas.service'
import { supabase } from '@/lib/supabase'
import type { MesaConDetalles, EstadoMesaType } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useMesas(sectorId: string | null, filterEstado?: EstadoMesaType) {
  const [mesas, setMesas] = useState<MesaConDetalles[]>([])
  const [loading, setLoading] = useState(true)

  const loadMesas = async () => {
    if (!sectorId) {
      setMesas([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await mesasService.getMesasBySector(sectorId)
      const filtered = filterEstado
        ? data.filter(m => m.estado === filterEstado)
        : data
      setMesas(filtered)
    } catch (error) {
      console.error('Error loading mesas:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMesas()
  }, [sectorId, filterEstado])

  // Realtime subscription
  useEffect(() => {
    if (!sectorId) return

    const channel = supabase
      .channel(`mesas-${sectorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mesas',
          filter: `uuid_sector=eq.${sectorId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime: mesas change', payload)
          loadMesas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sectorId])

  return { mesas, loading, loadMesas }
}
```

### 3.3. `src/features/mesas/hooks/useMesaInteraction.ts`

```typescript
import { useState } from 'react'
import { mesasRPCService } from '@/services/mesas-rpc.service'
import { toast } from 'sonner'
import type { ReservarMesaResponse, VenderMesaResponse } from '@/types/database'

export function useMesaInteraction() {
  const [loading, setLoading] = useState(false)

  const reservarMesa = async (mesaId: string): Promise<boolean> => {
    setLoading(true)
    try {
      const result = await mesasRPCService.reservarMesa(mesaId)

      if (!result.success) {
        toast.error('Error al reservar', {
          description: result.error || 'No se pudo reservar la mesa'
        })
        return false
      }

      toast.success('Mesa reservada', {
        description: `Mesa ${result.mesa_nombre} reservada exitosamente`
      })
      return true
    } catch (error) {
      toast.error('Error al reservar')
      return false
    } finally {
      setLoading(false)
    }
  }

  const liberarReserva = async (mesaId: string): Promise<boolean> => {
    setLoading(true)
    try {
      const result = await mesasRPCService.liberarReservaMesa(mesaId)

      if (!result.success) {
        toast.error('Error al liberar', {
          description: result.error || 'No se pudo liberar la reserva'
        })
        return false
      }

      toast.success('Reserva liberada', {
        description: `Mesa ${result.mesa_nombre} liberada`
      })
      return true
    } catch (error) {
      toast.error('Error al liberar reserva')
      return false
    } finally {
      setLoading(false)
    }
  }

  const venderMesa = async (
    mesaId: string,
    clienteDni: string,
    clienteNombre?: string,
    clienteEmail?: string,
    precioVenta?: number
  ): Promise<VenderMesaResponse | null> => {
    setLoading(true)
    try {
      const result = await mesasRPCService.venderMesa(
        mesaId,
        clienteDni,
        clienteNombre,
        clienteEmail,
        precioVenta
      )

      if (!result.success) {
        toast.error('Error al vender', {
          description: result.error || 'No se pudo vender la mesa'
        })
        return null
      }

      toast.success('Mesa vendida', {
        description: `Mesa ${result.mesa_nombre} vendida exitosamente`
      })
      return result
    } catch (error) {
      toast.error('Error al vender mesa')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    reservarMesa,
    liberarReserva,
    venderMesa
  }
}
```

---

### 3.4. `src/features/mesas/hooks/useEscaneoMesa.ts`

```typescript
import { useState } from 'react'
import { mesasRPCService } from '@/services/mesas-rpc.service'
import { toast } from 'sonner'
import type { EscanearMesaSeguridadResponse, EscanearMesaBartenderResponse } from '@/types/database'

export function useEscaneoMesa() {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<EscanearMesaSeguridadResponse | EscanearMesaBartenderResponse | null>(null)

  const escanearComoSeguridad = async (
    qrCode: string,
    soloVerificar: boolean = false
  ): Promise<EscanearMesaSeguridadResponse | null> => {
    setLoading(true)
    try {
      const result = await mesasRPCService.escanearMesaSeguridad(qrCode, soloVerificar)

      if (!result.success) {
        toast.error('Error al escanear', {
          description: result.error || 'QR inválido o no autorizado'
        })
        return null
      }

      setLastResult(result)

      if (!soloVerificar) {
        toast.success('Ingreso registrado', {
          description: `Mesa ${result.mesa_nombre} - ${result.escaneos_actuales}/${result.max_personas} personas`
        })
      }

      return result
    } catch (error) {
      toast.error('Error al procesar escaneo')
      return null
    } finally {
      setLoading(false)
    }
  }

  const escanearComoBartender = async (
    qrCode: string,
    marcarEntregado: boolean = false
  ): Promise<EscanearMesaBartenderResponse | null> => {
    setLoading(true)
    try {
      const result = await mesasRPCService.escanearMesaBartender(qrCode, marcarEntregado)

      if (!result.success) {
        toast.error('Error al escanear', {
          description: result.error || 'QR inválido'
        })
        return null
      }

      setLastResult(result)

      if (marcarEntregado) {
        toast.success('Consumición entregada', {
          description: `Mesa ${result.mesa_nombre} - ${result.detalle_consumicion}`
        })
      }

      return result
    } catch (error) {
      toast.error('Error al procesar escaneo')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    lastResult,
    escanearComoSeguridad,
    escanearComoBartender
  }
}
```

---

## 4. COMPONENTES POR ROL

Debido a la extensión del contenido, esta sección se ha dividido en un archivo complementario.

Ver: `FRONTEND_GUIDE_COMPONENTS.md` para el código completo de todos los componentes.

**Resumen de componentes:**

### Admin
- `SectoresPage.tsx` - CRUD de sectores con upload de imagen
- `MesasAdminPage.tsx` - Gestión de mesas en un sector
- `MesaFormDialog.tsx` - Formulario crear/editar mesa
- `SectorMapEditor.tsx` - Editor visual drag & drop para posicionar mesas

### RRPP
- `MesasRRPPPage.tsx` - Lista de sectores + vista del plano
- `SectorMapView.tsx` - Visualización interactiva del plano con círculos
- `MesaDetailDialog.tsx` - Detalle de mesa al hacer click
- `VenderMesaDialog.tsx` - Formulario de venta con DNI

### Seguridad
- `ScannerMesasPage.tsx` - Scanner integrado con resultado visual
- `MesaLocationView.tsx` - Muestra ubicación de la mesa en el mapa

### Bartender
- `BartenderLayout.tsx` - Layout similar a RRPPLayout
- `BartenderScannerPage.tsx` - Scanner QR para consumiciones
- `ConsumicionDetailView.tsx` - Detalle de consumición con acciones

---

## 5. NAVEGACIÓN Y RUTAS

### 5.1. Actualizar `src/App.tsx`

El archivo `App.tsx` no requiere cambios porque el bartender tendrá su propio router similar al de seguridad.

### 5.2. Actualizar `src/components/organisms/BottomNavigation.tsx`

Agregar el item "Mesas" para RRPP:

```typescript
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Calendar, UserPlus, DollarSign, User, Grid3x3 } from 'lucide-react'

const navItems = [
  {
    name: 'Eventos',
    icon: Calendar,
    path: '/dashboard/rrpp',
  },
  {
    name: 'Mesas',
    icon: Grid3x3,
    path: '/dashboard/rrpp/mesas',
  },
  {
    name: 'Mis Entradas',
    icon: UserPlus,
    path: '/dashboard/rrpp/invitados',
  },
  {
    name: 'Mis Ventas',
    icon: DollarSign,
    path: '/dashboard/rrpp/ventas',
  },
  {
    name: 'Perfil',
    icon: User,
    path: '/dashboard/rrpp/perfil',
  },
]

export function BottomNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/dashboard/rrpp') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-slate-200 dark:border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200',
                active
                  ? 'text-primary nav-icon-active'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

**IMPORTANTE**: Debido a que ahora son 5 items de navegación, considera si el diseño mobile se ve bien. Podrías:
- Reducir el tamaño de los iconos a `h-5 w-5`
- Reducir el padding horizontal
- O usar un drawer/menu para algunos items

### 5.3. Crear `src/components/organisms/BartenderLayout.tsx`

```typescript
import { BottomNavigationBartender } from '@/components/organisms/BottomNavigationBartender'

interface BartenderLayoutProps {
  children: React.ReactNode
}

export function BartenderLayout({ children }: BartenderLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background relative overflow-x-hidden">
      {/* Neon border effect */}
      <div className="neon-screen-border pointer-events-none" />

      {/* Main content area */}
      <main className="pb-16">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigationBartender />
    </div>
  )
}
```

### 5.4. Crear `src/components/organisms/BottomNavigationBartender.tsx`

```typescript
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScanLine, History, User } from 'lucide-react'

const navItems = [
  {
    name: 'Scanner',
    icon: ScanLine,
    path: '/dashboard/bartender',
  },
  {
    name: 'Historial',
    icon: History,
    path: '/dashboard/bartender/historial',
  },
  {
    name: 'Perfil',
    icon: User,
    path: '/dashboard/bartender/perfil',
  },
]

export function BottomNavigationBartender() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/dashboard/bartender') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-slate-200 dark:border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200',
                active
                  ? 'text-primary nav-icon-active'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

### 5.5. Actualizar `src/components/pages/DashboardRouter.tsx`

Agregar las rutas para bartender y mesas:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
// ... otros imports existentes

// Agregar imports para bartender
import { BartenderLayout } from '@/components/organisms/BartenderLayout'
import { BartenderScannerPage } from '@/components/pages/bartender/BartenderScannerPage'
import { BartenderHistorialPage } from '@/components/pages/bartender/BartenderHistorialPage'
import { BartenderPerfilPage } from '@/components/pages/bartender/BartenderPerfilPage'

// Agregar imports para mesas RRPP
import { MesasRRPPPage } from '@/components/pages/rrpp/MesasRRPPPage'

// Agregar imports para mesas Admin
import { SectoresPage } from '@/components/pages/admin/SectoresPage'
import { MesasAdminPage } from '@/components/pages/admin/MesasAdminPage'

export function DashboardRouter() {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect basado en rol
  if (user.rol === 'bartender') {
    return (
      <BartenderLayout>
        <Routes>
          <Route path="/" element={<BartenderScannerPage />} />
          <Route path="/historial" element={<BartenderHistorialPage />} />
          <Route path="/perfil" element={<BartenderPerfilPage />} />
          <Route path="*" element={<Navigate to="/dashboard/bartender" replace />} />
        </Routes>
      </BartenderLayout>
    )
  }

  if (user.rol === 'admin') {
    return (
      <Routes>
        {/* Rutas existentes de admin */}
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/eventos" element={<EventosPage />} />
        {/* NUEVAS RUTAS */}
        <Route path="/admin/sectores" element={<SectoresPage />} />
        <Route path="/admin/sectores/:sectorId/mesas" element={<MesasAdminPage />} />
        {/* ... otras rutas admin existentes */}
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    )
  }

  if (user.rol === 'rrpp') {
    return (
      <RRPPLayout>
        <Routes>
          <Route path="/rrpp" element={<EventosRRPPPage />} />
          <Route path="/rrpp/invitados" element={<InvitadosPage />} />
          <Route path="/rrpp/ventas" element={<VentasPage />} />
          {/* NUEVA RUTA */}
          <Route path="/rrpp/mesas" element={<MesasRRPPPage />} />
          <Route path="/rrpp/perfil" element={<PerfilPage />} />
          <Route path="*" element={<Navigate to="/dashboard/rrpp" replace />} />
        </Routes>
      </RRPPLayout>
    )
  }

  // ... seguridad routes existentes

  return <Navigate to="/login" replace />
}
```

---

## 6. COMPONENTE VISUAL DEL MAPA

### `src/features/mesas/components/SectorMapView.tsx`

Componente clave que muestra el plano del sector con las mesas como círculos interactivos:

```typescript
import { useRef, useEffect, useState } from 'react'
import type { Mesa, Sector } from '@/types/database'
import { cn } from '@/lib/utils'

interface SectorMapViewProps {
  sector: Sector
  mesas: Mesa[]
  onMesaClick?: (mesa: Mesa) => void
  highlightedMesaId?: string | null
  showPersonCount?: boolean
  className?: string
}

export function SectorMapView({
  sector,
  mesas,
  onMesaClick,
  highlightedMesaId,
  showPersonCount = false,
  className
}: SectorMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Actualizar tamaño del contenedor al montar y al redimensionar
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        setContainerSize({ width: offsetWidth, height: offsetHeight })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Función para obtener el color del círculo según estado
  const getMesaColor = (mesa: Mesa) => {
    if (mesa.estado === 'vendido') return 'bg-red-500 border-red-700'
    if (mesa.estado === 'reservado') return 'bg-yellow-500 border-yellow-700'
    return 'bg-green-500 border-green-700'
  }

  // Calcular posición del círculo en píxeles
  const getMesaPosition = (mesa: Mesa) => {
    // coordenada_x y coordenada_y vienen en porcentaje (0-100)
    const x = (mesa.coordenada_x / 100) * containerSize.width
    const y = (mesa.coordenada_y / 100) * containerSize.height
    return { x, y }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden',
        className
      )}
      style={{
        aspectRatio: '1080/1920', // Proporción 9:16 vertical
        maxHeight: '70vh'
      }}
    >
      {/* Imagen de fondo del sector */}
      {sector.imagen_url && (
        <img
          src={sector.imagen_url}
          alt={sector.nombre}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Capa de mesas (círculos) */}
      {containerSize.width > 0 && mesas.map((mesa) => {
        const { x, y } = getMesaPosition(mesa)
        const isHighlighted = highlightedMesaId === mesa.id
        const circleSize = isHighlighted ? 80 : 60 // Tamaño en píxeles

        return (
          <button
            key={mesa.id}
            onClick={() => onMesaClick?.(mesa)}
            className={cn(
              'absolute rounded-full border-4 flex flex-col items-center justify-center',
              'transition-all duration-200 transform',
              'text-white font-bold shadow-lg',
              getMesaColor(mesa),
              isHighlighted ? 'scale-125 z-20 ring-4 ring-white' : 'hover:scale-110 z-10',
              onMesaClick ? 'cursor-pointer' : 'cursor-default'
            )}
            style={{
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              left: `${x}px`,
              top: `${y}px`,
              transform: `translate(-50%, -50%) ${isHighlighted ? 'scale(1.25)' : ''}`
            }}
          >
            {/* Nombre de la mesa */}
            <span className={cn(
              'text-xs font-bold',
              isHighlighted ? 'text-sm' : 'text-xs'
            )}>
              {mesa.nombre}
            </span>

            {/* Nombre del RRPP si está reservado/vendido */}
            {mesa.id_rrpp && mesa.rrpp && (
              <span className="text-[10px] font-medium truncate max-w-[90%]">
                {mesa.rrpp.nombre}
              </span>
            )}

            {/* Indicador de personas ingresadas */}
            {showPersonCount && mesa.estado === 'vendido' && (
              <span className="text-[10px] font-medium">
                👥 {mesa.escaneos_seguridad_count}/{mesa.max_personas}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

---

Continúa en la siguiente respuesta...