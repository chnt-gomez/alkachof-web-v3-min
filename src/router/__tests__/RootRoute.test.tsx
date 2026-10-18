import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RootRoute } from '../RootRoute'

const authState = vi.hoisted(() => ({ isAuthenticated: false, isBooting: false }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated ? { alias: 'Ana' } : null,
    isAuthenticated: authState.isAuthenticated,
    isBooting: authState.isBooting,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

// `NavShell` reads the two app-wide providers that `AppRouter` mounts around
// every route. They are not the subject here — this suite is about which branch
// `/` takes — and standing them up would mean a notifications socket and a chat
// fetch to assert on a routing decision.
vi.mock('@/sections/notifications/useNotifications', () => ({
  useNotifications: () => ({ notifications: [], status: 'ready', unseen: 0, reload: vi.fn(), markSeen: vi.fn() }),
}))
vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ unreadCount: 0 }),
}))

function renderRoot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRoute />}>
          <Route index element={<div>Panel del vendedor</div>} />
        </Route>
        <Route path="/login" element={<div>Iniciar sesión — pantalla</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RootRoute', () => {
  it('shows the landing page to a visitor with no account', () => {
    authState.isAuthenticated = false
    authState.isBooting = false
    renderRoot()

    // The regression this guards: `/` used to sit behind ProtectedRoute, so a
    // stranger — and every crawler — was answered with a redirect to /login.
    // That is what made the promoted host impossible to rank.
    expect(screen.queryByText('Iniciar sesión — pantalla')).not.toBeInTheDocument()
    expect(screen.getByText('Bienvenido a Alkachof')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('shows the dashboard to a signed-in seller', () => {
    authState.isAuthenticated = true
    authState.isBooting = false
    renderRoot()

    expect(screen.getByText('Panel del vendedor')).toBeInTheDocument()
    expect(screen.queryByText('Bienvenido a Alkachof')).not.toBeInTheDocument()
  })

  it('shows neither while the session is still resolving', () => {
    authState.isAuthenticated = false
    authState.isBooting = true
    renderRoot()

    // Flashing the landing page at a seller on every cold start would read as
    // being signed out.
    expect(screen.queryByText('Bienvenido a Alkachof')).not.toBeInTheDocument()
    expect(screen.queryByText('Panel del vendedor')).not.toBeInTheDocument()
  })
})
