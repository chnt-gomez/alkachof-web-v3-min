import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupPage } from '../SignupPage'
import { AuthProvider } from '../AuthContext'
import { ToastProvider } from '@/components/ui/toast'

vi.mock('../actions/signup')
vi.mock('../actions/fetchProfile')

import { signup } from '../actions/signup'
import { fetchProfile } from '../actions/fetchProfile'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p', userId: 'u' })
})

describe('SignupPage', () => {
  it('renders the signup form in Spanish', () => {
    renderPage()
    expect(screen.getAllByText('Crear cuenta').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
  })

  it('shows the verify-your-email confirmation on success', async () => {
    vi.mocked(signup).mockResolvedValue({
      message: 'ok',
      user: { _id: 'u1', email: 'a@b.com', status: 'pending-registration', type: 'user', created: '' },
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secret123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secret123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'different')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no coinciden/i)
    expect(signup).not.toHaveBeenCalled()
  })

  it('rejects passwords shorter than 6 characters', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), '123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 6/i)
    expect(signup).not.toHaveBeenCalled()
  })
})
