import { Button } from '@/components/ui/button'
import { UserCheck, MapPin, Calendar, User, Pencil } from 'lucide-react'
import type { ClienteCheckResult } from '@/services/clientes.service'

interface ClienteExistenteCardProps {
  cliente: ClienteCheckResult
  dni: string
  onCreateQR: () => void
  onEdit: () => void
  onCancel: () => void
}

export function ClienteExistenteCard({
  cliente,
  dni,
  onCreateQR,
  onEdit,
  onCancel,
}: ClienteExistenteCardProps) {
  return (
    <div className="space-y-4">
      {/* Header con icono de éxito */}
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <UserCheck className="h-5 w-5" />
        <span className="font-semibold">Cliente Encontrado</span>
      </div>

      {/* Tarjeta con datos del cliente */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border">
        {/* DNI destacado */}
        <div className="text-center pb-3 border-b">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">DNI</span>
          <p className="text-2xl font-bold">{dni}</p>
        </div>

        {/* Nombre completo */}
        <div className="text-center">
          <p className="text-xl font-semibold">
            {cliente.nombre} {cliente.apellido}
          </p>
        </div>

        {/* Datos en grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Edad */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Edad: </span>
              <span className="font-medium">{cliente.edad || '-'} años</span>
            </span>
          </div>

          {/* Sexo */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Sexo: </span>
              <span className="font-medium capitalize">{cliente.sexo || '-'}</span>
            </span>
          </div>

          {/* Ubicación - ocupa 2 columnas */}
          <div className="col-span-2 flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>
              <span className="text-muted-foreground">Ubicación: </span>
              <span className="font-medium">
                {cliente.departamento && cliente.localidad
                  ? `${cliente.localidad}, ${cliente.departamento}`
                  : cliente.departamento || cliente.localidad || '-'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={onCreateQR}
          className="w-full h-12"
        >
          Continuar y Crear QR
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="flex-1 h-10"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar Datos
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 h-10"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
