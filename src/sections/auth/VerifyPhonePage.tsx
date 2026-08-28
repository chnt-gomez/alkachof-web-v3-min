import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthScreen } from '@/components/AuthScreen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/useToast'
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
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError('Ingresa el código de verificación')
      return
    }
    setSubmitting(true)
    try {
      await verifyPhone({ code: code.trim() })
      setDone(true)
    } catch {
      setError('El código no es válido o expiró. Solicita uno nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Ingresa tu correo para reenviar el código')
      return
    }
    setError(null)
    setResending(true)
    try {
      await resendPhoneCode({ email })
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
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="a3f9c2b81d04"
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
