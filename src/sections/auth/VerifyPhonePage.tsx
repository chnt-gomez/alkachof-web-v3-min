import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthScreen } from '@/components/AuthScreen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/useToast'
import { ApiError, isCodeDestroyedError } from '@/lib/api'
import { verifyPhone } from './actions/verifyPhone'
import { resendPhoneCode } from './actions/resendPhoneCode'

type LocationState = { email?: string }

export function VerifyPhonePage() {
  const location = useLocation()
  const stateEmail = (location.state as LocationState | null)?.email ?? ''
  const toast = useToast()

  const [email, setEmail] = useState(stateEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeDestroyed, setCodeDestroyed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Ingresa tu correo')
      return
    }
    if (!code.trim()) {
      setError('Ingresa el código de verificación')
      return
    }
    setSubmitting(true)
    try {
      await verifyPhone({ email: email.trim(), code: code.trim() })
      setDone(true)
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

  async function handleResend() {
    if (!email.trim()) {
      setError('Ingresa tu correo para reenviar el código')
      return
    }
    setError(null)
    setResending(true)
    try {
      await resendPhoneCode({ email: email.trim() })
      setCodeDestroyed(false)
      setCode('')
      toast.success('Te enviamos un nuevo código')
    } catch {
      toast.error('No pudimos reenviar el código. Intenta de nuevo.')
    } finally {
      setResending(false)
    }
  }

  if (done) {
    return (
      <AuthScreen>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Teléfono verificado</CardTitle>
            <CardDescription>Tu cuenta está lista. Ya puedes iniciar sesión.</CardDescription>
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
            <Button className="w-full" onClick={handleResend} disabled={resending}>
              {resending ? 'Reenviando...' : 'Reenviar código'}
            </Button>
          </CardContent>
        </Card>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Verifica tu teléfono</CardTitle>
          <CardDescription>Ingresa el código que te enviamos por mensaje de texto.</CardDescription>
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
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Verificando...' : 'Verificar'}
            </Button>
          </form>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Reenviando...' : 'Reenviar código'}
          </Button>
        </CardContent>
      </Card>
    </AuthScreen>
  )
}
