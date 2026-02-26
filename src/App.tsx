import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/pages/LoginPage'
import { ResetPasswordPage } from './components/pages/ResetPasswordPage'
import { themeService } from './services/theme.service'
import { Spinner } from './components/ui/spinner'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/auth.store'

// Lazy load del dashboard y componentes protegidos
const DashboardRouter = lazy(() => import('./components/pages/DashboardRouter').then(module => ({ default: module.DashboardRouter })))
const ProtectedRoute = lazy(() => import('./components/organisms/ProtectedRoute').then(module => ({ default: module.ProtectedRoute })))

function App() {
  const signOut = useAuthStore((s) => s.signOut)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    themeService.initTheme()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          signOut()
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, re-initialize to keep store in sync
        initialize()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [signOut, initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard/*"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen w-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Spinner className="mx-auto h-8 w-8" />
                    <p className="text-muted-foreground">Cargando...</p>
                  </div>
                </div>
              }
            >
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
