import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import ReCAPTCHA from 'react-google-recaptcha'
import { Eye, EyeOff } from 'lucide-react'
import { authLogsService } from '@/services/auth-logs.service'
import { rateLimitStorageService } from '@/services/rate-limit-storage.service'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, signIn, loading, initialized, initialize, signOutReason, clearSignOutReason } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTimer, setLockoutTimer] = useState(0)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  const MAX_ATTEMPTS = 5 // Máximo de intentos antes de requerir captcha
  const LOCKOUT_DURATION = 300 // 5 minutos en segundos

  // Verificar bloqueo persistente al cargar la página
  useEffect(() => {
    // Verificar si hay un bloqueo activo en localStorage
    const lockedEmail = rateLimitStorageService.getLockedEmail()

    if (lockedEmail) {
      // Si hay un email bloqueado, pre-llenarlo
      setEmail(lockedEmail)

      // Obtener datos del bloqueo
      const lockData = rateLimitStorageService.getLockout(lockedEmail)

      if (lockData.isLocked) {
        setIsLocked(true)
        setLockoutTimer(lockData.remainingSeconds)
        setFailedAttempts(lockData.attemptCount)
        setError(`Cuenta bloqueada por múltiples intentos fallidos. Espera ${Math.ceil(lockData.remainingSeconds / 60)} minutos.`)
      }
    }
  }, [])

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  useEffect(() => {
    if (user && initialized) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, initialized, navigate])

  // Verificar intentos fallidos y bloqueo al cambiar email
  useEffect(() => {
    const checkFailedAttempts = async () => {
      if (email && email.includes('@')) {
        // Primero verificar si hay bloqueo en localStorage
        const lockData = rateLimitStorageService.getLockout(email)

        if (lockData.isLocked) {
          // Hay bloqueo activo en localStorage
          setIsLocked(true)
          setLockoutTimer(lockData.remainingSeconds)
          setFailedAttempts(lockData.attemptCount)
          setError(`Cuenta bloqueada. Tiempo restante: ${Math.ceil(lockData.remainingSeconds / 60)} minutos.`)
        } else {
          // No hay bloqueo local, verificar intentos en BD
          const { count } = await authLogsService.getFailedLoginAttempts(email, 15)
          setFailedAttempts(count)

          if (count >= MAX_ATTEMPTS) {
            // Hay muchos intentos en BD, activar bloqueo
            setIsLocked(true)
            setLockoutTimer(LOCKOUT_DURATION)
            rateLimitStorageService.saveLockout(email, LOCKOUT_DURATION, count)
            setError(`Demasiados intentos fallidos detectados. Cuenta bloqueada por ${LOCKOUT_DURATION / 60} minutos.`)
          } else if (count > 0) {
            setError(null)
          }
        }
      }
    }

    if (email && email.includes('@')) {
      checkFailedAttempts()
    } else {
      // Si no hay email válido, resetear estados
      setFailedAttempts(0)
      setIsLocked(false)
      setLockoutTimer(0)
    }
  }, [email])

  // Temporizador de bloqueo
  useEffect(() => {
    if (isLocked && lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            // Bloqueo expirado - limpiar todo
            setIsLocked(false)
            setFailedAttempts(0)
            setError(null)
            rateLimitStorageService.clearLockout()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isLocked, lockoutTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    clearSignOutReason()

    // Validación de campos
    if (!email || !password) {
      setError('Por favor complete todos los campos')
      return
    }

    // Validación de bloqueo (verificar localStorage también por seguridad)
    const lockData = rateLimitStorageService.getLockout(email)
    if (isLocked || lockData.isLocked) {
      const seconds = lockData.isLocked ? lockData.remainingSeconds : lockoutTimer
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      setError(`Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutes}:${secs.toString().padStart(2, '0')}`)

      // Sincronizar estados si no estaban sincronizados
      if (lockData.isLocked && !isLocked) {
        setIsLocked(true)
        setLockoutTimer(lockData.remainingSeconds)
        setFailedAttempts(lockData.attemptCount)
      }
      return
    }

    // Validación de captcha si hay muchos intentos fallidos
    if (failedAttempts >= MAX_ATTEMPTS && !captchaToken) {
      setError('Por favor completa el captcha de verificación')
      return
    }

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      // Registrar intento fallido
      await authLogsService.logLoginFailed(email, signInError.message)

      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)

      // Bloquear después de MAX_ATTEMPTS intentos
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true)
        setLockoutTimer(LOCKOUT_DURATION)
        setError(`Demasiados intentos fallidos. Cuenta bloqueada temporalmente por ${LOCKOUT_DURATION / 60} minutos.`)

        // Guardar bloqueo en localStorage para persistencia
        rateLimitStorageService.saveLockout(email, LOCKOUT_DURATION, newAttempts)
      } else {
        setError(`${signInError.message} (${newAttempts}/${MAX_ATTEMPTS} intentos)`)
      }

      // Reset captcha
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
        setCaptchaToken(null)
      }
    } else {
      // Login exitoso - resetear intentos y limpiar localStorage
      setFailedAttempts(0)
      setIsLocked(false)
      rateLimitStorageService.clearLockout()
      navigate('/dashboard')
    }
  }

  const handleInputChange = () => {
    // Limpiar el mensaje de signOutReason cuando el usuario empiece a escribir
    if (signOutReason) {
      clearSignOutReason()
    }
    if (error) {
      setError(null)
    }
  }

  // Mostrar spinner mientras se inicializa
  if (!initialized || (user && initialized)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signOutReason && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{signOutReason}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  handleInputChange()
                }}
                disabled={loading || isLocked}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    handleInputChange()
                  }}
                  disabled={loading || isLocked}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isLocked}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Mostrar captcha si hay muchos intentos fallidos */}
            {failedAttempts >= MAX_ATTEMPTS && RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>
            )}

            {/* Indicador de intentos fallidos */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
              <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Intentos fallidos: {failedAttempts}/{MAX_ATTEMPTS}
                  {failedAttempts >= 3 && ' - Quedan pocos intentos antes del bloqueo'}
                </AlertDescription>
              </Alert>
            )}

            {/* Indicador de bloqueo */}
            {isLocked && lockoutTimer > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Cuenta bloqueada temporalmente. Tiempo restante: {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Iniciando sesión...
                </>
              ) : isLocked ? (
                'Cuenta bloqueada'
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
