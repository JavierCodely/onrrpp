import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Building2,
  Mail,
  Calendar,
  MapPin,
  Settings,
  LogOut,
  Palette,
} from 'lucide-react'

export function PerfilPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!user) {
    return null
  }

  const { personal, club } = user

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <User className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold">
          {personal.nombre} {personal.apellido}
        </h1>
        <Badge className="bg-blue-500">RRPP</Badge>
      </div>

      {/* Información Personal */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </h2>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Edad:</span>
              <span className="font-medium">{personal.edad} años</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sexo:</span>
              <span className="font-medium capitalize">{personal.sexo}</span>
            </div>

            {personal.ubicacion && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ubicación:</span>
                <span className="font-medium">{personal.ubicacion}</span>
              </div>
            )}

            {user.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información del Club */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Club
          </h2>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Nombre:</span>
              <span className="font-medium">{club.nombre}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración
          </h2>
          <Separator />

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => navigate('/dashboard/rrpp/tema')}
          >
            <Palette className="h-5 w-5" />
            Personalizar Tema
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
