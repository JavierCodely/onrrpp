import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useUserActivityCheck } from '@/hooks/useUserActivityCheck'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'rrpp' | 'seguridad' | 'bartender')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, initialized, initialize } = useAuthStore()
  const location = useLocation()

  // Verificar cada 15 segundos si el usuario está activo
  useUserActivityCheck()

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  if (loading || !initialized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.personal.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
