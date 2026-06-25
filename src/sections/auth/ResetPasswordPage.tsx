import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateToken } from './actions/validateToken'
import { resetPassword } from './actions/resetPassword'

type Status = 'validating' | 'invalid' | 'ready' | 'done'

export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('validating')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    validateToken(token)
      .then(() => {
        if (active) setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('invalid')
      })
    return () => {
      active = false
    }
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
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
      await resetPassword({ token, password })
      setStatus('done')
      setTimeout(() => navigate('/login'), 1500)
    } catch {
      setError('No pudimos restablecer tu contraseña. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p aria-busy="true" className="text-sm text-muted-foreground">
          Validando enlace...
        </p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              El enlace para restablecer tu contraseña no es válido o ya expiró.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/recover">
              <Button className="w-full">Solicitar uno nuevo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Contraseña actualizada</CardTitle>
            <CardDescription>Ya puedes iniciar sesión con tu nueva contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button className="w-full">Ir a iniciar sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>Define una contraseña para tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
        </CardContent>
      </Card>
    </div>
  )
}
