import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Spinner } from '@/components/ui/spinner'

// Lazy load de dashboards por rol - solo se carga el necesario
const AdminDashboard = lazy(() => import('./AdminDashboard').then(module => ({ default: module.AdminDashboard })))
const RRPPDashboard = lazy(() => import('./RRPPDashboard').then(module => ({ default: module.RRPPDashboard })))
const SeguridadDashboard = lazy(() => import('./SeguridadDashboard').then(module => ({ default: module.SeguridadDashboard })))
const BartenderDashboard = lazy(() => import('./BartenderDashboard').then(module => ({ default: module.BartenderDashboard })))

export function DashboardRouter() {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const LoadingFallback = (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner className="mx-auto h-8 w-8" />
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    </div>
  )

  switch (user.personal.rol) {
    case 'admin':
      return (
        <Suspense fallback={LoadingFallback}>
          <Routes>
            <Route path="admin/*" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
          </Routes>
        </Suspense>
      )
    case 'rrpp':
      return (
        <Suspense fallback={LoadingFallback}>
          <Routes>
            <Route path="rrpp/*" element={<RRPPDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard/rrpp" replace />} />
          </Routes>
        </Suspense>
      )
    case 'seguridad':
      return (
        <Suspense fallback={LoadingFallback}>
          <Routes>
            <Route path="seguridad/*" element={<SeguridadDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard/seguridad" replace />} />
          </Routes>
        </Suspense>
      )
    case 'bartender':
      return (
        <Suspense fallback={LoadingFallback}>
          <Routes>
            <Route path="bartender/*" element={<BartenderDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard/bartender" replace />} />
          </Routes>
        </Suspense>
      )
    default:
      return <Navigate to="/login" replace />
  }
}
