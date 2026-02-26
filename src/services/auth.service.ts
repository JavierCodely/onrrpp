import { supabase } from '../lib/supabase'
import type { AuthUser } from '../types/database'
import { authLogsService } from './auth-logs.service'

// Función para traducir errores comunes al español
const translateAuthError = (error: Error): string => {
  const errorMessage = error.message.toLowerCase()

  // Errores de credenciales inválidas
  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('invalid password')) {
    return 'Credenciales incorrectas. Verifica tu email y contraseña.'
  }

  // Usuario no encontrado
  if (errorMessage.includes('user not found')) {
    return 'No existe una cuenta con este email.'
  }

  // Email no confirmado
  if (errorMessage.includes('email not confirmed')) {
    return 'Tu email aún no ha sido confirmado. Revisa tu bandeja de entrada.'
  }

  // Muchos intentos fallidos
  if (errorMessage.includes('too many requests') ||
      errorMessage.includes('email rate limit exceeded')) {
    return 'Demasiados intentos fallidos. Espera unos minutos antes de intentar nuevamente.'
  }

  // Usuario inactivo
  if (errorMessage.includes('usuario inactivo')) {
    return 'Tu cuenta ha sido desactivada. Contacta al administrador.'
  }

  // Personal no encontrado
  if (errorMessage.includes('personal no encontrado')) {
    return 'Tu cuenta no está completamente configurada. Contacta al administrador.'
  }

  // Error de red
  if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('failed to fetch')) {
    return 'Error de conexión. Verifica tu conexión a internet.'
  }

  // Error de timeout
  if (errorMessage.includes('timeout')) {
    return 'La solicitud tardó demasiado. Intenta nuevamente.'
  }

  // Error por defecto
  return 'Error al iniciar sesión. Por favor, intenta nuevamente.'
}

export const authService = {
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned')

      // Obtener datos del personal
      const { data: personal, error: personalError } = await supabase
        .from('personal')
        .select(`
          *,
          club:clubs(*)
        `)
        .eq('id', authData.user.id)
        .single()

      if (personalError) throw personalError
      if (!personal) throw new Error('Personal no encontrado')
      if (!personal.activo) throw new Error('Usuario inactivo')

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        personal: {
          id: personal.id,
          nombre: personal.nombre,
          apellido: personal.apellido,
          edad: personal.edad,
          sexo: personal.sexo,
          ubicacion: personal.ubicacion,
          rol: personal.rol,
          grupo: personal.grupo,
          fecha_nacimiento: personal.fecha_nacimiento,
          uuid_club: personal.uuid_club,
          activo: personal.activo,
          created_at: personal.created_at,
          updated_at: personal.updated_at,
        },
        club: personal.club,
      }

      // Registrar login exitoso
      await authLogsService.logLoginSuccess(user.id, user.email)

      return { user, error: null }
    } catch (error) {
      const translatedMessage = translateAuthError(error as Error)
      return { user: null, error: new Error(translatedMessage) }
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      // Obtener usuario actual antes de cerrar sesión
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Registrar logout si había un usuario
      if (user?.id && user?.email) {
        await authLogsService.logLogout(user.id, user.email)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  async getCurrentUser(): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      // First check local session to avoid 403 on expired tokens
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { user: null, error: null }

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!authUser) return { user: null, error: null }

      const { data: personal, error: personalError } = await supabase
        .from('personal')
        .select(`
          *,
          club:clubs(*)
        `)
        .eq('id', authUser.id)
        .single()

      if (personalError) throw personalError
      if (!personal) return { user: null, error: null }
      if (!personal.activo) throw new Error('Usuario inactivo')

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email!,
        personal: {
          id: personal.id,
          nombre: personal.nombre,
          apellido: personal.apellido,
          edad: personal.edad,
          sexo: personal.sexo,
          ubicacion: personal.ubicacion,
          rol: personal.rol,
          grupo: personal.grupo,
          fecha_nacimiento: personal.fecha_nacimiento,
          uuid_club: personal.uuid_club,
          activo: personal.activo,
          created_at: personal.created_at,
          updated_at: personal.updated_at,
        },
        club: personal.club,
      }

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as Error }
    }
  },

  async checkUserActive(userId: string): Promise<{ isActive: boolean; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('activo')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Usuario no encontrado')

      return { isActive: data.activo, error: null }
    } catch (error) {
      return { isActive: false, error: error as Error }
    }
  },

  async requestPasswordReset(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}
