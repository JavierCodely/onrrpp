import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Building2 } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'bg-purple-500'
      case 'rrpp':
        return 'bg-blue-500'
      case 'seguridad':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRoleLabel = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'Administrador'
      case 'rrpp':
        return 'RRPP'
      case 'seguridad':
        return 'Seguridad'
      default:
        return rol
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-slate-900">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Sistema de Gestión</h1>
            {user && (
              <Badge className={getRoleBadgeColor(user.personal.rol)}>
                {getRoleLabel(user.personal.rol)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    {user.personal.nombre} {user.personal.apellido}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {user.club.nombre}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
