import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

/**
 * Hook que verifica cada 15 segundos si el usuario está activo.
 * Si el usuario está inactivo, cierra sesión y recarga la página.
 */
export function useUserActivityCheck() {
  const { user, signOut } = useAuthStore()
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    // Solo ejecutar si hay un usuario autenticado
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const checkUserActive = async () => {
      try {
        // Verificar estado activo del usuario en la tabla personal
        const { data, error } = await supabase
          .from('personal')
          .select('activo')
          .eq('id', user.id)
          .single()

        if (error) { 
          
          console.error('Error verificando estado del usuario:', error)
          return
        }

        // Si el usuario está inactivo, cerrar sesión
        if (data && !data.activo) {
          console.log('Usuario inactivo detectado, cerrando sesión...')

          // Cerrar sesión con razón
          await signOut('Tu cuenta ha sido deshabilitada, contacta con un administrador')
        }
      } catch (error) {
        console.error('Error en verificación de actividad:', error)
      }
    }

    // Ejecutar verificación inmediatamente
    checkUserActive()

    // Configurar intervalo de 15 segundos
    intervalRef.current = setInterval(checkUserActive, 15000)

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user, signOut])
}
