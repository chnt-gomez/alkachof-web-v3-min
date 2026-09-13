import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from '../ResetPasswordPage'
import { ApiError } from '@/lib/api'

vi.mock('../actions/resetPassword')

import { resetPassword } from '../actions/resetPassword'

function renderPage(state?: { email?: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reset', state }]}>
      <Routes>
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Inicio sesión</div>} />
        <Route path="/recover" element={<div>Recover</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResetPasswordPage', () => {
  it('renders email, code and password fields when arriving without state', () => {
    renderPage()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Código de verificación')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('prefills the email from navigation state and hides the field', () => {
    renderPage({ email: 'a@b.com' })
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
  })

  it('lets the user submit an email, code and a new password', async () => {
    vi.mocked(resetPassword).mockResolvedValue({ message: 'ok' })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'a@b.com')
    await user.type(screen.getByLabelText('Código de verificación'), '043532')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '043532',
        password: 'secret1',
      }),
    )
    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
  })

  it('shows an error when the code is invalid or expired', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new ApiError('Invalid token', 400))
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o expiró/i)
  })

  it('shows the destroyed-code state after too many wrong attempts', async () => {
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('Too many incorrect attempts. Request a new code.', 400, {
        message: 'Too many incorrect attempts. Request a new code.',
        codeDestroyed: true,
      }),
    )
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('Código bloqueado')).toBeInTheDocument()
  })

  it('shows a rate-limit message on 429', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new ApiError('Too many requests', 429))
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/demasiados intentos/i)
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '043532')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret2')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no coinciden/i)
    expect(resetPassword).not.toHaveBeenCalled()
  })
})
