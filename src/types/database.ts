export type UserRole = 'admin' | 'rrpp' | 'seguridad' | 'bartender'
export type MetodoPago = 'efectivo' | 'transferencia' | 'mixto'
export type ComisionTipo = 'monto' | 'porcentaje'
export type GrupoType = 'A' | 'B' | 'C' | 'D'
export type RazonRechazoType = 'codigo_vestimenta' | 'comportamiento_inadecuado' | 'otro'

export interface Personal {
  id: string
  nombre: string
  apellido: string
  edad: number | null
  sexo: 'hombre' | 'mujer'
  ubicacion: string | null
  rol: UserRole
  grupo: GrupoType | null
  fecha_nacimiento: string | null
  uuid_club: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  nombre: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Evento {
  id: string
  nombre: string
  fecha: string
  banner_url: string | null
  total_invitados: number
  total_ingresados: number
  uuid_club: string
  estado: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Lote {
  id: string
  nombre: string
  cantidad_maxima: number
  cantidad_actual: number
  precio: number
  es_vip: boolean
  grupo: GrupoType | null
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  uuid_evento: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Invitado {
  id: string
  nombre: string
  apellido: string
  edad: number | null
  pais: string | null
  provincia: string | null
  departamento: string | null
  localidad: string | null
  dni: string
  sexo: 'hombre' | 'mujer'
  uuid_evento: string
  id_rrpp: string
  uuid_lote: string | null
  ingresado: boolean
  fecha_ingreso: string | null
  rechazado: boolean
  razon_rechazo: RazonRechazoType | null
  razon_rechazo_detalle: string | null
  fecha_rechazo: string | null
  id_seguridad_rechazo: string | null
  qr_code: string
  profile_image_url: string | null
  created_at: string
  updated_at: string
}

export interface InvitadoConRRPP extends Invitado {
  rrpp: {
    nombre: string
    apellido: string
  }
}

export interface InvitadoConDetalles extends InvitadoConRRPP {
  lote: Lote | null
  evento: {
    nombre: string
    estado: boolean
  }
}

export interface AuthUser {
  id: string
  email: string
  personal: Personal
  club: Club
}

export interface Venta {
  id: string
  uuid_invitado: string
  uuid_evento: string
  uuid_lote: string
  id_rrpp: string
  metodo_pago: MetodoPago
  monto_total: number
  monto_efectivo: number
  monto_transferencia: number
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface VentaConDetalles extends Venta {
  invitado: {
    nombre: string
    apellido: string
    dni: string
  }
  evento: {
    nombre: string
  }
  lote: {
    nombre: string
    precio: number
    es_vip: boolean
  }
  rrpp: {
    nombre: string
    apellido: string
  }
}

export interface Ubicacion {
  id: string
  pais: string
  provincia: string
  departamento: string
  localidad: string
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  dni: string
  nombre: string
  apellido: string
  edad: number | null
  sexo: 'hombre' | 'mujer'
  pais: string | null
  provincia: string | null
  departamento: string | null
  localidad: string | null
  denegado: boolean
  denegado_razon: string | null
  denegado_fecha: string | null
  id_rrpp_creador: string | null
  created_at: string
  updated_at: string
}

export interface VentasRRPPStats {
  id_rrpp: string
  uuid_evento: string
  uuid_lote: string
  lote_nombre: string
  lote_precio: number
  lote_es_vip: boolean
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  cantidad_ventas: number
  monto_total_vendido: number
  monto_efectivo: number
  monto_transferencia: number
  comision_total: number
}

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

// ============================================
// MESAS SYSTEM TYPES
// ============================================

export type EstadoMesa = 'libre' | 'reservado' | 'vendido'

export interface Sector {
  id: string
  nombre: string
  imagen_url: string
  uuid_evento: string
  uuid_club: string
  created_at: string
  updated_at: string
}

export interface Mesa {
  id: string
  nombre: string
  uuid_sector: string
  uuid_evento: string
  uuid_club: string
  estado: EstadoMesa
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
  // Joined from personal table (optional)
  rrpp?: { nombre: string; apellido: string } | null
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
  metodo_pago?: string
  monto_efectivo?: number
  monto_transferencia?: number
  qr_code: string
  nombre_cliente?: string
  apellido_cliente?: string
  dni_cliente?: string
  telefono_cliente?: string
  cantidad_personas: number
  precio_final: number
  fecha_entrega_consumicion: string | null
  created_at: string
  updated_at: string
}

export interface SectorConMesas extends Sector {
  mesas: Mesa[]
  total_mesas: number
  mesas_libres: number
  mesas_reservadas: number
  mesas_vendidas: number
}

export interface MesaConDetalles extends Mesa {
  sector: {
    nombre: string
    imagen_url: string
  }
  venta?: VentaMesa
  rrpp?: {
    nombre: string
    apellido: string
  }
}

export interface VentaMesaResult {
  success: boolean
  venta_id?: string
  qr_code?: string
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
  mostrar_confirmacion?: boolean
}

export interface SectorSeguridad {
  id: string
  uuid_sector: string
  id_seguridad: string
  uuid_club: string
  created_at: string
  updated_at: string
}

export interface SectorSeguridadConDetalles extends SectorSeguridad {
  sector_nombre: string
  seguridad_nombre: string
  seguridad_apellido: string
  evento_nombre: string
  uuid_evento: string
}
