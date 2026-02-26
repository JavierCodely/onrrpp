import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { themeService, type ThemeMode, type ThemeColor } from '@/services/theme.service'
import { Moon, Sun, Palette, Check } from 'lucide-react'
import { toast } from 'sonner'

const colorThemes = [
  {
    value: 'default' as ThemeColor,
    name: 'Default',
    description: 'Tema predeterminado',
    preview: 'bg-slate-900',
  },
  {
    value: 'neon-purple' as ThemeColor,
    name: 'Purple Neon',
    description: 'Violeta neón',
    preview: 'bg-purple-600',
  },
  {
    value: 'neon-cyan' as ThemeColor,
    name: 'Cyan Neon',
    description: 'Cian neón',
    preview: 'bg-cyan-500',
  },
  {
    value: 'neon-pink' as ThemeColor,
    name: 'Pink Neon',
    description: 'Rosa neón',
    preview: 'bg-pink-600',
  },
  {
    value: 'neon-green' as ThemeColor,
    name: 'Green Neon',
    description: 'Verde neón',
    preview: 'bg-green-500',
  },
  {
    value: 'neon-orange' as ThemeColor,
    name: 'Orange Neon',
    description: 'Naranja neón',
    preview: 'bg-orange-500',
  },
  {
    value: 'neon-red' as ThemeColor,
    name: 'Red Neon',
    description: 'Rojo neón',
    preview: 'bg-red-600',
  },
]

export function ConfiguracionPage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [selectedColor, setSelectedColor] = useState<ThemeColor>('default')

  useEffect(() => {
    const preferences = themeService.getPreferences()
    setThemeMode(preferences.mode)
    setSelectedColor(preferences.color)
  }, [])

  const handleToggleMode = () => {
    const newMode = themeService.toggleMode()
    setThemeMode(newMode)
    toast.success(`Tema ${newMode === 'dark' ? 'oscuro' : 'claro'} activado`)
  }

  const handleColorChange = (color: ThemeColor) => {
    setSelectedColor(color)
    themeService.setColor(color)
    toast.success('Paleta de colores actualizada')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza la apariencia de la aplicación
        </p>
      </div>

      {/* Modo Claro/Oscuro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {themeMode === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            Modo de Apariencia
          </CardTitle>
          <CardDescription>
            Cambia entre modo claro y oscuro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-mode" className="text-base">
                Tema Oscuro
              </Label>
              <p className="text-sm text-muted-foreground">
                {themeMode === 'dark'
                  ? 'Modo oscuro activado'
                  : 'Modo claro activado'}
              </p>
            </div>
            <Switch
              id="theme-mode"
              checked={themeMode === 'dark'}
              onCheckedChange={handleToggleMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Paleta de Colores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Paleta de Colores
          </CardTitle>
          <CardDescription>
            Elige tu paleta de colores favorita con efectos neón
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colorThemes.map((theme) => (
              <Button
                key={theme.value}
                variant={selectedColor === theme.value ? 'default' : 'outline'}
                className={`h-auto flex-col items-start p-4 relative ${
                  selectedColor === theme.value ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleColorChange(theme.value)}
              >
                {selectedColor === theme.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5" />
                  </div>
                )}
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={`h-12 w-12 rounded-md ${theme.preview} shadow-lg`}
                  />
                  <div className="text-left">
                    <p className="font-semibold">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Los temas neón se ven mejor en modo oscuro para un efecto más vibrante
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
