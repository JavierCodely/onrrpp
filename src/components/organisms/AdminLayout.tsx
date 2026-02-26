import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  LogOut,
  User,
  Building2,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Menu,
  Palette,
  DollarSign,
  MapPin,
  Grid3x3,
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard/admin',
  },
  {
    name: 'Eventos',
    icon: Calendar,
    path: '/dashboard/admin/eventos',
  },
  {
    name: 'Sectores',
    icon: MapPin,
    path: '/dashboard/admin/sectores',
  },
  {
    name: 'Mesas',
    icon: Grid3x3,
    path: '/dashboard/admin/mesas',
  },
  {
    name: 'Ventas',
    icon: DollarSign,
    path: '/dashboard/admin/ventas',
  },
  {
    name: 'Empleados',
    icon: Users,
    path: '/dashboard/admin/empleados',
  },
  {
    name: 'Configuraciones',
    icon: Settings,
    path: '/dashboard/admin/configuraciones',
  },
  {
    name: 'Tema',
    icon: Palette,
    path: '/dashboard/admin/tema',
  },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard/admin') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold">Panel Admin</h1>
        <Badge className="mt-2 bg-purple-500">Administrador</Badge>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                active
                  ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        {user && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium truncate">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {user.personal.nombre} {user.personal.apellido}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 truncate">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{user.club.nombre}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="flex h-screen">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-64 bg-white dark:bg-card border-r border-slate-200 dark:border-border flex-col">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-10 flex items-center gap-4 border-b bg-white dark:bg-card px-4 py-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex flex-col h-full">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold">Panel Admin</h1>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
