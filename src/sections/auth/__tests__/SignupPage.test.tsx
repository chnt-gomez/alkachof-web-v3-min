import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupPage } from '../SignupPage'
import { AuthProvider } from '../AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'

vi.mock('../actions/signup')
vi.mock('../actions/fetchProfile')

import { signup } from '../actions/signup'
import { fetchProfile } from '../actions/fetchProfile'

function renderPage() {
  // A fresh QueryClient per render: AuthProvider reads the profile through
  // the cache, and a shared client would leak one test's session into another.
  return render(
    withQueryClient(
      <MemoryRouter initialEntries={['/signup']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<div>Login</div>} />
              <Route path="/verify" element={<div>Verify</div>} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p', userId: 'u' })
})

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Correo'), 'a@b.com')
  await user.type(screen.getByLabelText('Teléfono'), '5512345678')
  await user.type(screen.getByLabelText('Contraseña'), 'secret123')
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret123')
}

describe('SignupPage', () => {
  it('renders the signup form in Spanish', () => {
    renderPage()
    expect(screen.getAllByText('Crear cuenta').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument()
  })

  it('navigates to the phone verification screen on success', async () => {
    vi.mocked(signup).mockResolvedValue({
      message: 'ok',
      user: { _id: 'u1', email: 'a@b.com', status: 'pending-registration', type: 'user', created: '' },
    })
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Verify')).toBeInTheDocument()
    expect(signup).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123', phone: '5512345678' })
  })

  it('rejects a phone number that is not 10 digits', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Teléfono'), '551234')
    await user.type(screen.getByLabelText('Contraseña'), 'secret123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/10 dígitos/i)
    expect(signup).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Teléfono'), '5512345678')
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
    await user.type(screen.getByLabelText('Teléfono'), '5512345678')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), '123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 6/i)
    expect(signup).not.toHaveBeenCalled()
  })
})
