import { useAuth } from '@/sections/auth/useAuth'
import { NavShell } from '@/components/NavShell'
import { AboutPage } from '@/sections/about/AboutPage'
import { AuthBootSkeleton } from './ProtectedRoute'

/**
 * The public front door.
 *
 * `/` used to sit behind `ProtectedRoute`, which meant a stranger — and every
 * crawler — was answered with a redirect to `/login`. `app.alkachof.mx` is the
 * address being promoted, so its root has to answer "what is this?" to someone
 * with no account. See `blueprint.SEO.md` §4.
 *
 * Signed in, nothing moves: `NavShell` renders and its `<Outlet />` is the
 * dashboard, exactly as before. Signed out, the same product pitch served at
 * `/about` renders here instead of a redirect — **one component, two URLs**,
 * both pointing `rel="canonical"` at `/`. A second landing page maintained
 * beside the first is a page that drifts, and crawlers punish the copy that
 * loses.
 *
 * This is also the route the build prerenders (`scripts/prerender.mjs`), which
 * only works because the guest branch reads no session: it has to render
 * identically in Node with no browser, no token and no API.
 */
export function RootRoute() {
  const { isAuthenticated, isBooting } = useAuth()

  if (isBooting) return <AuthBootSkeleton />
  if (!isAuthenticated) return <AboutPage />

  return <NavShell />
}
