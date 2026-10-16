import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/sections/auth/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shown while `AuthProvider` resolves whether there is a session.
 *
 * Exported because `RootRoute` has to show the *same* thing: `/` now decides
 * between a public landing page and the dashboard, and two different waiting
 * states for one question would read as two different screens loading.
 */
export function AuthBootSkeleton() {
  return (
    <div className="min-h-screen flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth()
  const location = useLocation()

  if (isBooting) return <AuthBootSkeleton />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
