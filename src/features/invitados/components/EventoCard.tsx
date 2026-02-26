import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, UserCheck, Sparkles, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Evento } from '@/types/database'
import { useAuthStore } from '@/stores/auth.store'

interface EventoCardProps {
  evento: Evento
  isExpanded: boolean
  onToggle: (eventoId: string) => void
}

export function EventoCard({ evento, isExpanded, onToggle }: EventoCardProps) {
  const { user } = useAuthStore()
  const [showStats, setShowStats] = useState(true)

  const formatFechaCompleta = (fecha: string) => {
    try {
      const date = new Date(fecha)
      const dia = format(date, "EEEE", { locale: es })
      const numero = format(date, "d", { locale: es })
      const mes = format(date, "MMMM", { locale: es })
      return { dia: dia.toUpperCase(), numero, mes: mes.toUpperCase() }
    } catch {
      return { dia: '', numero: '', mes: '' }
    }
  }

  const formatHora = (fecha: string) => {
    try {
      return format(new Date(fecha), "HH:mm", { locale: es })
    } catch {
      return ''
    }
  }

  const { dia, numero, mes } = formatFechaCompleta(evento.fecha)

  const toggleStats = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowStats(!showStats)
  }

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-all hover:shadow-xl ${
        isExpanded ? 'ring-2 ring-primary shadow-xl' : ''
      }`}
      onClick={() => onToggle(evento.id)}
    >
      {/* Banner con overlay */}
      <div className="relative h-40 w-full">
        {evento.banner_url ? (
          <img
            src={evento.banner_url}
            alt={evento.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        )}

        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Fecha flotante estilo calendario */}
        <div className="absolute top-3 left-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xl min-w-[65px]">
            <div className="bg-primary px-3 py-1">
              <div className="text-[9px] font-bold text-primary-foreground tracking-widest text-center">{dia}</div>
            </div>
            <div className="px-3 py-1.5 text-center">
              <div className="text-2xl font-black text-foreground leading-none">{numero}</div>
              <div className="text-[9px] font-semibold text-muted-foreground mt-0.5">{mes}</div>
            </div>
          </div>
        </div>

        {/* Botón ocultar stats */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-slate-900"
            onClick={toggleStats}
          >
            {showStats ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          {isExpanded && (
            <Badge className="bg-primary/90 backdrop-blur-sm shadow-lg gap-1">
              <Sparkles className="h-3 w-3" />
              Activo
            </Badge>
          )}
        </div>

        {/* Info sobre el banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-white drop-shadow-lg line-clamp-1">
                {evento.nombre}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/95 font-semibold drop-shadow">
                  {user?.club.nombre}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/85 drop-shadow font-medium">
                  {formatHora(evento.fecha)} hs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats con fondo que usa el banner */}
      <div className="relative overflow-hidden">
        {/* Fondo difuminado del banner */}
        {evento.banner_url ? (
          <>
            <div
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${evento.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px) brightness(0.7)',
              }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-indigo-700/90" />
        )}

        {/* Contenido de stats */}
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            {showStats ? (
              <div className="flex items-center gap-6">
                {/* Mis invitados */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{evento.total_invitados || 0}</div>
                    <div className="text-[10px] text-white/80 uppercase tracking-wide font-medium">Entradas</div>
                  </div>
                </div>

                {/* Ingresados */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-green-500/30 backdrop-blur-sm">
                    <UserCheck className="h-5 w-5 text-green-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-300">{evento.total_ingresados || 0}</div>
                    <div className="text-[10px] text-white/80 uppercase tracking-wide font-medium">Ingresados</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/80">
                <Eye className="h-4 w-4" />
                <span className="text-sm">Stats ocultas</span>
              </div>
            )}

            {/* Botón para expandir */}
            <button
              className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                isExpanded
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onToggle(evento.id)
              }}
            >
              {isExpanded ? 'Ocultar lista' : 'Ver invitados'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
