import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateToken } from './actions/validateToken'

type Status = 'validating' | 'success' | 'error'

export function VerifyEmailPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('validating')

  useEffect(() => {
    let active = true
    validateToken(token)
      .then(() => {
        if (active) setStatus('success')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [token])

  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p aria-busy="true" className="text-sm text-muted-foreground">
          Activando tu cuenta...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>No pudimos activar tu cuenta</CardTitle>
            <CardDescription>
              El enlace de activación no es válido o ya expiró. Vuelve a registrarte para recibir uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/signup">
              <Button className="w-full">Volver a registrarse</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Ir a iniciar sesión
              </Button>
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
          <CardTitle>Cuenta activada</CardTitle>
          <CardDescription>Tu cuenta está lista. Ya puedes iniciar sesión.</CardDescription>
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
