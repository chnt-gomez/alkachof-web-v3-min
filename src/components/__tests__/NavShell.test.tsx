import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NavShell } from '../NavShell'

const authState = vi.hoisted(() => ({ isAuthenticated: false }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated ? { alias: 'Ana' } : null,
    isAuthenticated: authState.isAuthenticated,
    isBooting: false,
  }),
}))

vi.mock('@/sections/notifications/useNotifications', () => ({
  useNotifications: () => ({ unseen: 0 }),
}))

vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ unreadCount: 0 }),
}))

// Echoes the `from` LoginPage would redirect back to after a successful login.
function LoginProbe() {
  const state = useLocation().state as { from?: string } | null
  return <div>Ingreso, volver a: {state?.from ?? 'ninguno'}</div>
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/catalog/abc123']}>
      <Routes>
        <Route element={<NavShell />}>
          <Route path="/catalog/:catalogId" element={<div>Contenido del catálogo</div>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  authState.isAuthenticated = false
})

describe('NavShell header', () => {
  it('points the brand mark at the landing page and hides the profile for guests', () => {
    renderShell()

    expect(screen.getByRole('link', { name: /conoce la plataforma/i })).toHaveAttribute(
      'href',
      '/about',
    )
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /notificaciones/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })

  it('sends the current catalog along to login so the visitor comes back', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('link', { name: 'Ingresar' }))

    expect(screen.getByText('Ingreso, volver a: /catalog/abc123')).toBeInTheDocument()
  })

  it('renders the full authenticated header and tab bar', () => {
    authState.isAuthenticated = true
    renderShell()

    expect(screen.getByRole('link', { name: 'Alkachof — inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Notificaciones' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
  })

  it('opens the contact info modal from the help button', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Ayuda' }))

    expect(screen.getByRole('dialog', { name: 'Ayuda y contacto' })).toBeInTheDocument()
    expect(screen.getByText('admin@alkachof.mx')).toBeInTheDocument()
    expect(screen.getByText('+52 33 2506 4128')).toBeInTheDocument()
  })
})
