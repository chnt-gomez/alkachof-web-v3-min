import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthScreen } from '@/components/AuthScreen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, isCodeDestroyedError } from '@/lib/api'
import { resetPassword } from './actions/resetPassword'

type LocationState = { email?: string }

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateEmail = (location.state as LocationState | null)?.email ?? ''

  const [email, setEmail] = useState(stateEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeDestroyed, setCodeDestroyed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Ingresa tu correo')
      return
    }
    if (!code.trim()) {
      setError('Ingresa el código que te enviamos')
      return
    }
    if (!password) {
      setError('Ingresa tu nueva contraseña')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword({ email: email.trim(), token: code.trim(), password })
      setDone(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      if (isCodeDestroyedError(err)) {
        setCodeDestroyed(true)
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
      } else {
        setError('El código no es válido o expiró.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthScreen>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Contraseña actualizada</CardTitle>
            <CardDescription>Ya puedes iniciar sesión con tu nueva contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button className="w-full">Ir a iniciar sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthScreen>
    )
  }

  if (codeDestroyed) {
    return (
      <AuthScreen>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Código bloqueado</CardTitle>
            <CardDescription>
              Bloqueamos este código por seguridad. Hiciste demasiados intentos incorrectos.
              Solicita un código nuevo para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/recover" state={{ email }}>
              <Button className="w-full">Solicitar código nuevo</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Nueva contraseña</CardTitle>
          <CardDescription>Ingresa el código que te enviamos y define una nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!stateEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            ¿No recibiste el código?{' '}
            <Link to="/recover" state={{ email }} className="font-medium text-primary underline-offset-4 hover:underline">
              Solicita uno nuevo
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthScreen>
  )
}
