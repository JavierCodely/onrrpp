import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Calendar, UserPlus, DollarSign, User, Grid3x3 } from 'lucide-react'

const navItems = [
  {
    name: 'Eventos',
    icon: Calendar,
    path: '/dashboard/rrpp',
  },
  {
    name: 'Entradas',
    icon: UserPlus,
    path: '/dashboard/rrpp/invitados',
  },
  {
    name: 'Mesas',
    icon: Grid3x3,
    path: '/dashboard/rrpp/mesas',
  },
  {
    name: 'Ventas',
    icon: DollarSign,
    path: '/dashboard/rrpp/ventas',
  },
  {
    name: 'Perfil',
    icon: User,
    path: '/dashboard/rrpp/perfil',
  },
]

export function BottomNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/dashboard/rrpp') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-slate-200 dark:border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200',
                active
                  ? 'text-primary nav-icon-active'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
