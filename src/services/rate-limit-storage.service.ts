/**
 * Servicio para manejar la persistencia del rate limiting en localStorage
 * Previene que usuarios bypaseen el bloqueo recargando la página
 */

interface LockoutData {
  email: string
  expiresAt: number // timestamp en milisegundos
  attemptCount: number
}

const STORAGE_KEY = 'auth_lockout'

export const rateLimitStorageService = {
  /**
   * Guarda el estado de bloqueo en localStorage
   */
  saveLockout(email: string, durationSeconds: number, attemptCount: number): void {
    const expiresAt = Date.now() + (durationSeconds * 1000)
    const data: LockoutData = {
      email: email.toLowerCase(),
      expiresAt,
      attemptCount,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  },

  /**
   * Obtiene el estado de bloqueo actual si existe y no ha expirado
   */
  getLockout(email: string): { isLocked: boolean; remainingSeconds: number; attemptCount: number } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { isLocked: false, remainingSeconds: 0, attemptCount: 0 }
      }

      const data: LockoutData = JSON.parse(stored)

      // Verificar si es el mismo email (case-insensitive)
      if (data.email.toLowerCase() !== email.toLowerCase()) {
        return { isLocked: false, remainingSeconds: 0, attemptCount: 0 }
      }

      const now = Date.now()

      // Si ya expiró, limpiar y retornar no bloqueado
      if (now >= data.expiresAt) {
        this.clearLockout()
        return { isLocked: false, remainingSeconds: 0, attemptCount: 0 }
      }

      // Calcular segundos restantes
      const remainingSeconds = Math.ceil((data.expiresAt - now) / 1000)

      return {
        isLocked: true,
        remainingSeconds,
        attemptCount: data.attemptCount,
      }
    } catch (error) {
      console.error('Error reading lockout from localStorage:', error)
      this.clearLockout()
      return { isLocked: false, remainingSeconds: 0, attemptCount: 0 }
    }
  },

  /**
   * Limpia el bloqueo del localStorage
   */
  clearLockout(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  /**
   * Verifica si existe un bloqueo activo para cualquier email
   */
  hasActiveLockout(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return false

      const data: LockoutData = JSON.parse(stored)
      const now = Date.now()

      if (now >= data.expiresAt) {
        this.clearLockout()
        return false
      }

      return true
    } catch (error) {
      this.clearLockout()
      return false
    }
  },

  /**
   * Obtiene el email del bloqueo activo (si existe)
   */
  getLockedEmail(): string | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data: LockoutData = JSON.parse(stored)
      const now = Date.now()

      if (now >= data.expiresAt) {
        this.clearLockout()
        return null
      }

      return data.email
    } catch (error) {
      this.clearLockout()
      return null
    }
  },
}
