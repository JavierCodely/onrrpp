'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export interface FechaNacimientoValues {
  dia: string
  mes: string
  anio: string
}

interface FechaNacimientoInputsProps {
  dia: string
  mes: string
  anio: string
  onDiaChange: (value: string) => void
  onMesChange: (value: string) => void
  onAnioChange: (value: string) => void
  idPrefix?: string
  className?: string
}

export function FechaNacimientoInputs({
  dia,
  mes,
  anio,
  onDiaChange,
  onMesChange,
  onAnioChange,
  idPrefix = 'fecha-nac',
  className = '',
}: FechaNacimientoInputsProps) {
  const anioActual = new Date().getFullYear()

  return (
    <div className={`space-y-1.5 min-w-0 ${className}`}>
      <Label>Fecha de nacimiento *</Label>
      <div className="grid grid-cols-[52px_minmax(0,1fr)_72px] gap-1.5">
        <Input
          id={`${idPrefix}-dia`}
          placeholder="Día"
          type="number"
          min={1}
          max={31}
          value={dia}
          onChange={(e) => onDiaChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
          className="h-11 min-h-11"
        />
        <Select value={mes} onValueChange={onMesChange}>
          <SelectTrigger id={`${idPrefix}-mes`} className="h-11 min-h-11">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${idPrefix}-anio`}
          placeholder="Año"
          type="number"
          min={1900}
          max={anioActual}
          value={anio}
          onChange={(e) => onAnioChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="h-11 min-h-11"
        />
      </div>
    </div>
  )
}

/** Convierte YYYY-MM-DD a { dia, mes, anio } */
export function parseFechaNacimiento(fecha: string | null | undefined): FechaNacimientoValues {
  if (!fecha || typeof fecha !== 'string') return { dia: '', mes: '', anio: '' }
  const s = String(fecha).slice(0, 10)
  if (s.length < 10) return { dia: '', mes: '', anio: '' }
  const [anio, mes, dia] = s.split('-')
  return { dia: dia || '', mes: mes || '', anio: anio || '' }
}

/** Convierte { dia, mes, anio } a YYYY-MM-DD */
export function toFechaNacimiento(dia: string, mes: string, anio: string): string {
  const d = dia.padStart(2, '0')
  const m = mes.padStart(2, '0')
  if (!anio || !m || !d) return ''
  return `${anio}-${m}-${d}`
}

/** Calcula edad a partir de fecha YYYY-MM-DD */
export function calcularEdad(fechaNacimiento: string): number {
  const [y, m, d] = fechaNacimiento.split('-').map(Number)
  const hoy = new Date()
  let edad = hoy.getFullYear() - y
  const mesDiff = hoy.getMonth() + 1 - m
  const diaDiff = hoy.getDate() - d
  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) edad--
  return edad
}
