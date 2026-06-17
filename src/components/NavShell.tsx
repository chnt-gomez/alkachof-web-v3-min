import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/sections/auth/AuthContext'

export function NavShell() {
  const { isAuthenticated, profile, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Alkachof
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{profile?.alias ?? 'Mi cuenta'}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Salir
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
