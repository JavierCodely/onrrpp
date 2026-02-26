import { supabase } from '../lib/supabase'

export interface AuthLogEntry {
  user_id?: string | null
  email: string
  action: 'login_success' | 'login_failed' | 'logout'
  ip_address?: string | null
  user_agent?: string | null
  error_message?: string | null
}

/**
 * Obtiene la IP del cliente (requiere servicio externo o backend)
 * Por ahora retorna null, se puede integrar con un servicio como ipify.org
 */
const getClientIP = async (): Promise<string | null> => {
  try {
    // En producción, esto debería venir del backend o de un servicio externo
    // Por ahora lo dejamos como null para evitar llamadas externas
    return null
  } catch {
    return null
  }
}

/**
 * Obtiene el user agent del navegador
 */
const getUserAgent = (): string => {
  return navigator.userAgent
}

export const authLogsService = {
  /**
   * Registra un intento de autenticación
   */
  async logAuthAttempt(entry: AuthLogEntry): Promise<{ success: boolean; error: Error | null }> {
    try {
      const ip_address = entry.ip_address || await getClientIP()
      const user_agent = entry.user_agent || getUserAgent()

      const { error } = await supabase.rpc('log_auth_attempt', {
        p_user_id: entry.user_id || null,
        p_email: entry.email,
        p_action: entry.action,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
        p_error_message: entry.error_message || null,
      })

      if (error) throw error

      return { success: true, error: null }
    } catch (error) {
      console.error('Error logging auth attempt:', error)
      return { success: false, error: error as Error }
    }
  },

  /**
   * Obtiene el número de intentos fallidos de login en los últimos N minutos
   */
  async getFailedLoginAttempts(email: string, minutes: number = 15): Promise<{ count: number; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('get_failed_login_attempts', {
        p_email: email,
        p_minutes: minutes,
      })

      if (error) throw error

      return { count: data || 0, error: null }
    } catch (error) {
      console.error('Error getting failed login attempts:', error)
      return { count: 0, error: error as Error }
    }
  },

  /**
   * Registra un login exitoso
   */
  async logLoginSuccess(userId: string, email: string): Promise<void> {
    await this.logAuthAttempt({
      user_id: userId,
      email,
      action: 'login_success',
    })
  },

  /**
   * Registra un login fallido
   */
  async logLoginFailed(email: string, errorMessage: string): Promise<void> {
    await this.logAuthAttempt({
      email,
      action: 'login_failed',
      error_message: errorMessage,
    })
  },

  /**
   * Registra un logout
   */
  async logLogout(userId: string, email: string): Promise<void> {
    await this.logAuthAttempt({
      user_id: userId,
      email,
      action: 'logout',
    })
  },
}
