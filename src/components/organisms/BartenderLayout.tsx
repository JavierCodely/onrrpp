import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Camera, History, LogOut } from 'lucide-react'
import { toast } from 'sonner'

interface BartenderLayoutProps {
  children?: React.ReactNode
}

export function BartenderLayout({ children }: BartenderLayoutProps) {
  const location = useLocation()
  const { signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sesión cerrada')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Bartender Panel</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container py-6 px-4">
        {children || <Outlet />}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden sticky bottom-0 z-40 w-full border-t bg-background pb-safe">
        <div className="grid grid-cols-2 gap-1 p-2">
          <Link to="/bartender/scanner">
            <Button
              variant={isActive('/bartender/scanner') ? 'default' : 'ghost'}
              className="w-full gap-2"
            >
              <Camera className="h-5 w-5" />
              <span>Escáner</span>
            </Button>
          </Link>

          <Link to="/bartender/historial">
            <Button
              variant={isActive('/bartender/historial') ? 'default' : 'ghost'}
              className="w-full gap-2"
            >
              <History className="h-5 w-5" />
              <span>Historial</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-16 bottom-0 w-64 border-r bg-background">
        <nav className="p-4 space-y-2">
          <Link to="/bartender/scanner">
            <Button
              variant={isActive('/bartender/scanner') ? 'default' : 'ghost'}
              className="w-full justify-start gap-2"
            >
              <Camera className="h-5 w-5" />
              Escáner QR
            </Button>
          </Link>

          <Link to="/bartender/historial">
            <Button
              variant={isActive('/bartender/historial') ? 'default' : 'ghost'}
              className="w-full justify-start gap-2"
            >
              <History className="h-5 w-5" />
              Historial
            </Button>
          </Link>
        </nav>
      </aside>
    </div>
  )
}
