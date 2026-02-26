export type ThemeMode = 'light' | 'dark'
export type ThemeColor = 'default' | 'neon-purple' | 'neon-cyan' | 'neon-pink' | 'neon-green' | 'neon-orange' | 'neon-red'

export interface ThemePreferences {
  mode: ThemeMode
  color: ThemeColor
}

const THEME_STORAGE_KEY = 'app-theme-preferences'

const defaultPreferences: ThemePreferences = {
  mode: 'light',
  color: 'default',
}

export const themeService = {
  // Obtener preferencias del localStorage
  getPreferences(): ThemePreferences {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error al leer preferencias de tema:', error)
    }
    return defaultPreferences
  },

  // Guardar preferencias en localStorage
  savePreferences(preferences: ThemePreferences): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error('Error al guardar preferencias de tema:', error)
    }
  },

  // Aplicar tema al documento
  applyTheme(preferences: ThemePreferences): void {
    const root = document.documentElement

    // Aplicar/remover clase dark
    if (preferences.mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Remover todas las clases de tema previas
    root.classList.remove(
      'theme-neon-purple',
      'theme-neon-cyan',
      'theme-neon-pink',
      'theme-neon-green',
      'theme-neon-orange',
      'theme-neon-red'
    )

    // Aplicar clase de color si no es default
    if (preferences.color !== 'default') {
      root.classList.add(`theme-${preferences.color}`)
    }
  },

  // Inicializar tema (llamar al cargar la app)
  initTheme(): ThemePreferences {
    const preferences = this.getPreferences()
    this.applyTheme(preferences)
    return preferences
  },

  // Cambiar modo (light/dark)
  setMode(mode: ThemeMode): void {
    const preferences = this.getPreferences()
    preferences.mode = mode
    this.savePreferences(preferences)
    this.applyTheme(preferences)
  },

  // Cambiar color
  setColor(color: ThemeColor): void {
    const preferences = this.getPreferences()
    preferences.color = color
    this.savePreferences(preferences)
    this.applyTheme(preferences)
  },

  // Toggle entre light y dark
  toggleMode(): ThemeMode {
    const preferences = this.getPreferences()
    const newMode = preferences.mode === 'light' ? 'dark' : 'light'
    this.setMode(newMode)
    return newMode
  },
}
