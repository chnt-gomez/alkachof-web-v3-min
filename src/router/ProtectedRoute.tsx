import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/sections/auth/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth()
  const location = useLocation()

  if (isBooting) {
    return (
      <div className="min-h-screen flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
