import { useEffect, useState } from 'react'
import { clientesAdminService, type ClienteAdmin } from '@/services/clientes-admin.service'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Calendar as CalendarIcon } from 'lucide-react'

export function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroDenegado, setFiltroDenegado] = useState<'todos' | 'denegados' | 'permitidos'>('todos')
  const [filtroCumpleanios, setFiltroCumpleanios] = useState<string>('')

  const loadClientes = async () => {
    setLoading(true)
    const { data, error } = await clientesAdminService.getClientesAdmin()
    if (error) {
      toast.error('Error al cargar clientes', {
        description: error.message,
      })
    } else if (data) {
      setClientes(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClientes()
  }, [])

  const handleToggleDenegado = async (cliente: ClienteAdmin, value: boolean) => {
    const prev = clientes
    setClientes((curr) =>
      curr.map((c) => (c.id === cliente.id ? { ...c, denegado: value } : c)),
    )

    const { error } = await clientesAdminService.updateClienteDenegado(cliente.id, value)
    if (error) {
      toast.error('Error al actualizar cliente', { description: error.message })
      setClientes(prev)
    } else {
      toast.success(value ? 'Cliente prohibido' : 'Cliente habilitado')
    }
  }

  const searchLower = search.trim().toLowerCase()
  const filteredClientes = clientes.filter((c) => {
    const matchesSearch =
      searchLower.length === 0 ||
      c.dni.toLowerCase().includes(searchLower) ||
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchLower)

    const matchesDenegado =
      filtroDenegado === 'todos' ||
      (filtroDenegado === 'denegados' && c.denegado) ||
      (filtroDenegado === 'permitidos' && !c.denegado)

    const matchesCumpleanios =
      !filtroCumpleanios ||
      (c.fecha_nacimiento && (() => {
        // Ignoramos el año, comparamos solo mes y día
        const [, m, d] = filtroCumpleanios.split('-').map(Number)
        const fn = String(c.fecha_nacimiento).slice(0, 10)
        const [, cm, cd] = fn.split('-').map(Number)
        return cm === m && cd === d
      })())

    return matchesSearch && matchesDenegado && matchesCumpleanios
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Listado global de clientes asociados a tu club, con historial de ingresos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes del club</CardTitle>
          <CardDescription>
            Nombre, DNI, cantidad de ingresos y estado de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cliente-search">
                  Buscar por DNI, nombre o apellido
                </label>
                <Input
                  id="cliente-search"
                  placeholder="Ej: 12345678 o Juan Pérez"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-56 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Filtro por estado de acceso
                </label>
                <Select
                  value={filtroDenegado}
                  onValueChange={(v) => setFiltroDenegado(v as typeof filtroDenegado)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado de acceso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="permitidos">Solo permitidos</SelectItem>
                    <SelectItem value="denegados">Solo denegados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-52 space-y-1">
                <Label htmlFor="filtro-cumpleanios" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Cumpleaños el día
                </Label>
                <Input
                  id="filtro-cumpleanios"
                  type="date"
                  value={filtroCumpleanios}
                  onChange={(e) => setFiltroCumpleanios(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            {filtroCumpleanios && (
              <p className="text-xs text-muted-foreground">
                Mostrando clientes que cumplen años el {new Date(filtroCumpleanios + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}.
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay clientes registrados aún.
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay clientes que coincidan con el filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Cumpleaños</TableHead>
                    <TableHead className="text-center">Veces ingresado</TableHead>
                    <TableHead className="text-center">Ingresado en evento activo</TableHead>
                    <TableHead className="text-center">Prohibir ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.nombre} {c.apellido}
                      </TableCell>
                      <TableCell>{c.dni}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.fecha_nacimiento
                          ? new Date(String(c.fecha_nacimiento).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{c.veces_ingresado}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.ingresado_activo ? (
                          <Badge className="bg-green-500 text-white">True</Badge>
                        ) : (
                          <Badge variant="outline">False</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={c.denegado}
                            onCheckedChange={(val) => handleToggleDenegado(c, val as boolean)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {c.denegado ? 'Prohibido' : 'Permitido'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

