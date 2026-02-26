import type { RazonRechazoType } from '@/types/database'

export const RAZONES_RECHAZO: { value: RazonRechazoType; label: string }[] = [
  { value: 'codigo_vestimenta', label: 'Codigo de Vestimenta' },
  { value: 'comportamiento_inadecuado', label: 'Comportamiento Inadecuado' },
  { value: 'otro', label: 'Otro' },
]
