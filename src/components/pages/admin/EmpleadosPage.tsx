import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import type { Personal, UserRole, GrupoType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Eye,
  EyeOff,
} from 'lucide-react'

export function EmpleadosPage() {
  const { user } = useAuthStore()
  const [empleados, setEmpleados] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Personal | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    sexo: 'hombre' as 'hombre' | 'mujer',
    ubicacion: '',
    rol: 'rrpp' as UserRole,
    grupo: '' as GrupoType | '',
    fecha_nacimiento: '',
    password: '',
  })

  useEffect(() => {
    loadEmpleados()
  }, [])

  const loadEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('uuid_club', user?.club.id)
        .order('apellido')

      if (error) throw error

      setEmpleados(data || [])
    } catch (error) {
      toast.error('Error al cargar empleados', {
        description: (error as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (empleado?: Personal) => {
    if (empleado) {
      setSelectedEmpleado(empleado)
      setFormData({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: '',
        sexo: empleado.sexo,
        ubicacion: empleado.ubicacion || '',
        rol: empleado.rol,
        grupo: empleado.grupo || '',
        fecha_nacimiento: empleado.fecha_nacimiento || '',
        password: '',
      })
    } else {
      setSelectedEmpleado(null)
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        sexo: 'hombre',
        ubicacion: '',
        rol: 'rrpp',
        grupo: '',
        fecha_nacimiento: '',
        password: '',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedEmpleado(null)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      sexo: 'hombre',
      ubicacion: '',
      rol: 'rrpp',
      grupo: '',
      fecha_nacimiento: '',
      password: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que admin y rrpp tengan grupo asignado
    if ((formData.rol === 'admin' || formData.rol === 'rrpp') && !formData.grupo) {
      toast.error('El rol ' + formData.rol.toUpperCase() + ' requiere un grupo asignado (A, B, C, D)')
      return
    }

    try {
      if (selectedEmpleado) {
        // Actualizar empleado existente
        const updates: any = {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          sexo: formData.sexo,
          ubicacion: formData.ubicacion.trim() || null,
          rol: formData.rol,
          grupo: formData.grupo || null,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('personal')
          .update(updates)
          .eq('id', selectedEmpleado.id)

        if (error) throw error

        // Actualizar la lista local inmediatamente sin recargar
        setEmpleados(empleados.map(emp =>
          emp.id === selectedEmpleado.id
            ? { ...emp, ...updates }
            : emp
        ))

        toast.success('Empleado actualizado correctamente')
      } else {
        // Crear nuevo empleado requiere Supabase Auth + personal
        toast.info('Funcionalidad de crear empleado en desarrollo', {
          description: 'Por ahora, crea usuarios desde el dashboard de Supabase y asigna el grupo aquí',
        })
        handleCloseDialog()
        return
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Error al guardar empleado', {
        description: (error as Error).message,
      })
    }
  }

  const handleToggleActivo = async (empleado: Personal) => {
    try {
      const nuevoEstado = !empleado.activo

      const { error } = await supabase
        .from('personal')
        .update({ activo: nuevoEstado })
        .eq('id', empleado.id)

      if (error) throw error

      // Actualizar el estado local inmediatamente sin recargar toda la lista
      setEmpleados(empleados.map(emp =>
        emp.id === empleado.id
          ? { ...emp, activo: nuevoEstado }
          : emp
      ))

      toast.success(nuevoEstado ? 'Empleado activado' : 'Empleado desactivado')
    } catch (error) {
      toast.error('Error al cambiar estado', {
        description: (error as Error).message,
      })
    }
  }

  const getRolBadge = (rol: UserRole) => {
    const badges: Record<UserRole, React.ReactElement> = {
      admin: <Badge className="bg-blue-500">Admin</Badge>,
      rrpp: <Badge className="bg-green-500">RRPP</Badge>,
      seguridad: <Badge className="bg-orange-500">Seguridad</Badge>,
      bartender: <Badge className="bg-purple-500">Bartender</Badge>,
    }
    return badges[rol]
  }

  const getGrupoBadge = (grupo: GrupoType | null) => {
    if (!grupo) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Shield className="h-3 w-3" />
          Sin grupo
        </Badge>
      )
    }

    const grupoColors = {
      A: 'bg-purple-500 text-white',
      B: 'bg-cyan-500 text-white',
      C: 'bg-orange-500 text-white',
      D: 'bg-pink-500 text-white',
    }

    return (
      <Badge className={`gap-1 ${grupoColors[grupo]}`}>
        <Shield className="h-3 w-3" />
        Grupo {grupo}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
        <p className="text-muted-foreground">
          Gestión de personal del club
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          <CardDescription>
            Personal del club con sus roles y grupos asignados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando empleados...
            </div>
          ) : empleados.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                No hay empleados registrados
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email/ID</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.map((empleado) => (
                    <TableRow key={empleado.id}>
                      <TableCell className="font-medium">
                        {empleado.nombre} {empleado.apellido}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {empleado.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{getRolBadge(empleado.rol)}</TableCell>
                      <TableCell>{getGrupoBadge(empleado.grupo)}</TableCell>
                      <TableCell>
                        {empleado.activo ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100">
                            <UserX className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(empleado)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActivo(empleado)}
                          >
                            {empleado.activo ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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

      {/* Dialog Formulario de Empleado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmpleado
                ? 'Modifica los datos del empleado'
                : 'Completa los datos para crear un nuevo empleado'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo *</Label>
                <Select
                  value={formData.sexo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sexo: value as 'hombre' | 'mujer' })
                  }
                >
                  <SelectTrigger id="sexo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hombre">Hombre</SelectItem>
                    <SelectItem value="mujer">Mujer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input
                  id="ubicacion"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  placeholder="Ej: Buenos Aires"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  La edad se calcula automáticamente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value) => {
                      const nuevoRol = value as UserRole
                      setFormData({
                        ...formData,
                        rol: nuevoRol,
                        // Resetear grupo si es seguridad
                        grupo: nuevoRol === 'seguridad' ? '' : formData.grupo,
                      })
                    }}
                  >
                    <SelectTrigger id="rol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="rrpp">RRPP</SelectItem>
                      <SelectItem value="seguridad">Seguridad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grupo">
                    Grupo {(formData.rol === 'admin' || formData.rol === 'rrpp') && '*'}
                  </Label>
                  <Select
                    value={formData.grupo || 'NINGUNO'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, grupo: value === 'NINGUNO' ? '' : (value as GrupoType) })
                    }
                    disabled={formData.rol === 'seguridad'}
                  >
                    <SelectTrigger id="grupo">
                      <Shield className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NINGUNO">Sin grupo (solo seguridad)</SelectItem>
                      <SelectItem value="A">Grupo A</SelectItem>
                      <SelectItem value="B">Grupo B</SelectItem>
                      <SelectItem value="C">Grupo C</SelectItem>
                      <SelectItem value="D">Grupo D</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.rol === 'seguridad'
                      ? 'Seguridad no requiere grupo'
                      : 'Requerido para Admin y RRPP'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedEmpleado ? 'Guardar cambios' : 'Crear empleado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
