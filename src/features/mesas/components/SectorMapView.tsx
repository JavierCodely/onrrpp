import { useCallback, useRef } from 'react'
import { MesaCircle } from './MesaCircle'
import type { Mesa } from '@/types/database'

interface SectorMapViewProps {
  imagenUrl: string
  mesas: Mesa[]
  onMesaClick: (mesa: Mesa) => void
  onMesaLongPress?: (mesa: Mesa) => void
  isAdmin?: boolean
  onMesaDragEnd?: (mesaId: string, x: number, y: number) => void
  onMapClick?: (x: number, y: number) => void
  highlightMesaId?: string | null
  currentUserId?: string | null
}

export function SectorMapView({
  imagenUrl,
  mesas,
  onMesaClick,
  onMesaLongPress,
  isAdmin = false,
  onMesaDragEnd,
  onMapClick,
  highlightMesaId,
  currentUserId,
}: SectorMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onMapClick || !containerRef.current) return
      // Ignore clicks on mesa circles
      if ((e.target as HTMLElement).closest('[data-mesa-circle]')) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      onMapClick(
        Math.max(0, Math.min(100, parseFloat(x.toFixed(2)))),
        Math.max(0, Math.min(100, parseFloat(y.toFixed(2))))
      )
    },
    [onMapClick]
  )

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        id="sector-map-container"
        className={`relative w-full aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden ${
          onMapClick ? 'cursor-crosshair' : ''
        }`}
        style={{
          backgroundImage: `url(${imagenUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          maxHeight: '75vh',
        }}
        onClick={handleContainerClick}
      >
        {mesas.map((mesa) => (
          <MesaCircle
            key={mesa.id}
            mesa={mesa}
            onClick={onMesaClick}
            onLongPress={onMesaLongPress}
            isAdmin={isAdmin}
            onDragEnd={onMesaDragEnd}
            highlight={highlightMesaId === mesa.id}
            currentUserId={currentUserId}
          />
        ))}

        {mesas.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-center bg-black/50 px-4 py-2 rounded-lg">
              {isAdmin ? 'Creá una mesa y posicionala en el mapa' : 'No hay mesas disponibles'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-3 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Libre</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Vendido</span>
        </div>
      </div>
    </div>
  )
}
