import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '../LoginPage'
import { AuthProvider } from '../AuthContext'

vi.mock('../actions/login')
vi.mock('../actions/fetchProfile')

import { login } from '../actions/login'
import { fetchProfile } from '../actions/fetchProfile'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Inicio</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(fetchProfile).mockResolvedValue({
    _id: 'p1',
    userId: 'u1',
    alias: 'demo',
  })
})

describe('LoginPage', () => {
  it('renders the login form in Spanish', () => {
    renderPage()
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('navigates to home on successful login', async () => {
    vi.mocked(login).mockResolvedValue({ token: 't', refreshToken: 'r' })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'user@admin.com')
    await user.type(screen.getByLabelText('Contraseña'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(screen.getByText('Inicio')).toBeInTheDocument())
    expect(login).toHaveBeenCalledWith({ email: 'user@admin.com', password: 'admin' })
  })

  it('shows a Spanish error when login fails', async () => {
    vi.mocked(login).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'user@admin.com')
    await user.type(screen.getByLabelText('Contraseña'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/correo o contraseña incorrectos/i)
  })

  it('blocks submission with empty fields', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ingresa tu correo y contraseña/i)
    expect(login).not.toHaveBeenCalled()
  })
})
