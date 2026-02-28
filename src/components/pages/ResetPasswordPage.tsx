import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase'
import ReCAPTCHA from 'react-google-recaptcha'

type PageMode = 'request' | 'update' | 'success'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<PageMode>('request')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Request mode state
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Update mode state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Captcha para solicitud de reset
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

  // Check if user arrived from password reset email
  useEffect(() => {
    const checkSession = async () => {
      // Check URL for recovery token (Supabase puede usar hash o query params)
      const url = new URL(window.location.href)
      const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.substring(1) : url.hash)
      const searchParams = url.searchParams
      const type = hashParams.get('type') || searchParams.get('type')

      if (type === 'recovery') {
        // User clicked the reset link - Supabase handles the session automatically
        setMode('update')
        setCheckingSession(false)
        return
      }

      // Also check if there's an active session with recovery type
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Check if this is a recovery session by looking at the URL or session
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
        if (accessToken) {
          setMode('update')
        }
      }

      setCheckingSession(false)
    }

    // Listen for auth state changes (important for recovery flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
        setCheckingSession(false)
      }
    })

    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email) {
      setError('Por favor ingresa tu email')
      setLoading(false)
      return
    }

    // Requerir captcha si está configurado
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setError('Por favor completa el captcha antes de enviar la solicitud')
      setLoading(false)
      return
    }

    const { error: resetError } = await authService.requestPasswordReset(email)

    if (resetError) {
      setError('Error al enviar el email. Intenta nuevamente.')
    } else {
      setEmailSent(true)
    }

    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { error: updateError } = await authService.updatePassword(password)

    if (updateError) {
      setError('Error al actualizar la contraseña. El enlace puede haber expirado.')
    } else {
      setMode('success')
      // Sign out after password change so user can login with new password
      await supabase.auth.signOut()
    }

    setLoading(false)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    )
  }

  // Success mode - password updated
  if (mode === 'success') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Contraseña Actualizada</CardTitle>
            <CardDescription className="text-center">
              Tu contraseña ha sido cambiada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Ir a Iniciar Sesion
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Update mode - user arrived from email link
  if (mode === 'update') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Nueva Contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimo 6 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(null)
                    }}
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError(null)
                    }}
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Request mode - user wants to reset password (email sent view)
  if (emailSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Revisa tu Email</CardTitle>
            <CardDescription className="text-center">
              Hemos enviado un enlace de recuperacion a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Si no ves el email, revisa tu carpeta de spam o correo no deseado.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Request mode - initial form
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                  setCaptchaToken(null)
                }}
                disabled={loading}
                required
              />
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => {
                    setCaptchaToken(token)
                    setError(null)
                  }}
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Enviando...
                </>
              ) : (
                'Enviar Enlace de Recuperacion'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
