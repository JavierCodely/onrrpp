import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número en formato argentino
 * - Separador de miles: punto (.)
 * - Separador de decimales: coma (,)
 * - Ejemplo: 1500.50 → $1.500,50
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(num)) {
    return '$0,00'
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Formatea un número sin el símbolo de moneda en formato argentino
 * Ejemplo: 1500.50 → 1.500,50
 */
export function formatNumber(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(num)) {
    return '0,00'
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
