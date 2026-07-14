import { Link, NavLink, Outlet } from 'react-router-dom'
import { Store, CircleUserRound, ShoppingCart, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'
import { useAuth } from '@/sections/auth/useAuth'

const TABS = [
  { to: '/', label: 'Inicio', icon: Store },
  { to: '/cart', label: 'Carrito', icon: ShoppingCart },
  { to: '/transactions', label: 'Pedidos', icon: ReceiptText },
  { to: '/profile', label: 'Perfil', icon: CircleUserRound },
]

export function NavShell() {
  const { isAuthenticated, profile } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link to="/" aria-label="Alkachof — inicio">
            <BrandMark />
          </Link>
          {isAuthenticated ? (
            <Link to="/profile" aria-label="Mi perfil" className="shrink-0">
              {profile?.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.alias ?? 'Perfil'}
                  className="h-9 w-9 rounded-full border object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {(profile?.alias ?? 'A').charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
          )}
        </div>
      </header>

      <main className={cn('flex-1', isAuthenticated && 'pb-24')}>
        <Outlet />
      </main>

      {isAuthenticated && (
        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="flex">
            {TABS.map(({ to, label, icon: Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                          isActive && 'bg-secondary'
                        )}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
