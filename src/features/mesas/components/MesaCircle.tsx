import { useRef, useCallback } from 'react'
import type { Mesa } from '@/types/database'

interface MesaCircleProps {
  mesa: Mesa
  onClick: (mesa: Mesa) => void
  onLongPress?: (mesa: Mesa) => void
  isAdmin?: boolean
  onDragEnd?: (mesaId: string, x: number, y: number) => void
  highlight?: boolean
  currentUserId?: string | null
}

export function MesaCircle({ mesa, onClick, onLongPress, isAdmin = false, onDragEnd, highlight = false, currentUserId }: MesaCircleProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const getColorClasses = () => {
    switch (mesa.estado) {
      case 'libre':
        return 'bg-green-500/70 border-green-700/70'
      case 'reservado':
        return 'bg-yellow-500/70 border-yellow-700/70'
      case 'vendido':
        return 'bg-red-500/70 border-red-700/70'
      default:
        return 'bg-gray-500/70 border-gray-700/70'
    }
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin || !onDragEnd) return
    const container = document.getElementById('sector-map-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    onDragEnd(mesa.id, parseFloat(newX.toFixed(2)), parseFloat(newY.toFixed(2)))
  }

  const startLongPress = useCallback(() => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress?.(mesa)
    }, 500)
  }, [mesa, onLongPress])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    onClick(mesa)
  }, [mesa, onClick])

  return (
    <div
      data-mesa-circle
      draggable={isAdmin}
      onDragEnd={handleDragEnd}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      style={{
        position: 'absolute',
        left: `${mesa.coordenada_x}%`,
        top: `${mesa.coordenada_y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      className={`
        w-14 h-14 rounded-full border-3 flex flex-col items-center justify-center
        cursor-pointer shadow-lg transition-all z-10 select-none
        ${getColorClasses()}
        ${!highlight && currentUserId && mesa.id_rrpp === currentUserId ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}
        ${highlight ? 'ring-4 ring-white animate-pulse scale-125' : ''}
      `}
      onClick={handleClick}
    >
      <div className="text-center text-white font-bold leading-tight">
        <div className="text-[9px] truncate max-w-12">{mesa.nombre}</div>
        {mesa.estado === 'vendido' && (
          <div className="text-[8px] font-normal">
            {mesa.escaneos_seguridad_count}/{mesa.max_personas}
          </div>
        )}
      </div>
    </div>
  )
}
