import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/sections/auth/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth()
  const location = useLocation()

  if (isBooting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
