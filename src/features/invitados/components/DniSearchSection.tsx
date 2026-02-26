import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, Loader2, UserCheck, UserX, AlertTriangle } from 'lucide-react'
import type { ClienteCheckResult } from '@/services/clientes.service'

interface DniSearchSectionProps {
  dniInput: string
  onDniInputChange: (value: string) => void
  checkingDni: boolean
  onSearchDni: () => void
  dniVerificado: boolean
  clienteEncontrado: ClienteCheckResult | null
  clienteDenegado: boolean
}

export function DniSearchSection({
  dniInput,
  onDniInputChange,
  checkingDni,
  onSearchDni,
  dniVerificado,
  clienteEncontrado,
  clienteDenegado,
}: DniSearchSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dni-input" className="text-base font-semibold">DNI *</Label>
        <div className="flex gap-2">
          <Input
            id="dni-input"
            value={dniInput}
            onChange={(e) => onDniInputChange(e.target.value)}
            placeholder="Ingresa el DNI"
            disabled={checkingDni}
            className="text-lg font-bold"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearchDni()
              }
            }}
          />
          <Button
            type="button"
            onClick={onSearchDni}
            disabled={checkingDni || !dniInput.trim()}
            className="px-6"
          >
            {checkingDni ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mensaje de cliente denegado */}
      {clienteDenegado && clienteEncontrado && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <UserX className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Ingreso Denegado
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Se prohibio el ingreso a este cliente. Debe acercarse al club para aclarar su situacion.
              </p>
              {clienteEncontrado.denegado_razon && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Razon: {clienteEncontrado.denegado_razon}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de cliente encontrado */}
      {dniVerificado && clienteEncontrado && !clienteDenegado && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            <p className="text-green-700 dark:text-green-300">
              Cliente encontrado: <strong>{clienteEncontrado.nombre} {clienteEncontrado.apellido}</strong>. Los datos fueron cargados automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de cliente nuevo */}
      {dniVerificado && !clienteEncontrado && !clienteDenegado && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <p className="text-blue-700 dark:text-blue-300">
              Cliente nuevo. Completa los datos del invitado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
