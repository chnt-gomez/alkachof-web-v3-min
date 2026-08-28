import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from '../ResetPasswordPage'

vi.mock('../actions/resetPassword')

import { resetPassword } from '../actions/resetPassword'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset']}>
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
  it('renders code and password fields', () => {
    renderPage()
    expect(screen.getByLabelText('Código de verificación')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('lets the user submit a code and a new password', async () => {
    vi.mocked(resetPassword).mockResolvedValue({ message: 'ok' })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Código de verificación'), 'a3f9c2b81d04')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ token: 'a3f9c2b81d04', password: 'secret1' }),
    )
    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
  })

  it('shows an error when the code is invalid or expired', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new Error('Invalid token'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Código de verificación'), 'bad-code')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o expiró/i)
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Código de verificación'), 'a3f9c2b81d04')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret2')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no coinciden/i)
    expect(resetPassword).not.toHaveBeenCalled()
  })
})
