import type { RazonRechazoType } from '@/types/database'
import { RAZONES_RECHAZO } from './scanner.constants'

export function getRazonLabel(razon: RazonRechazoType): string {
  return RAZONES_RECHAZO.find(r => r.value === razon)?.label || razon
}
