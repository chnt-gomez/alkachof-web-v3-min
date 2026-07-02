import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from '../ResetPasswordPage'

vi.mock('../actions/validateToken')
vi.mock('../actions/resetPassword')

import { validateToken } from '../actions/validateToken'
import { resetPassword } from '../actions/resetPassword'

function renderPage(token = 'good-token') {
  return render(
    <MemoryRouter initialEntries={[`/reset/${token}`]}>
      <Routes>
        <Route path="/reset/:token" element={<ResetPasswordPage />} />
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
  it('shows an invalid-link screen when the token does not validate', async () => {
    vi.mocked(validateToken).mockRejectedValue(new Error('bad'))
    renderPage('bad')
    expect(await screen.findByText('Enlace inválido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar uno nuevo' })).toBeInTheDocument()
  })

  it('lets the user submit a new password when the token is valid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ valid: true })
    vi.mocked(resetPassword).mockResolvedValue({ message: 'ok' })
    const user = userEvent.setup()
    renderPage('good')

    await screen.findByText('Nueva contraseña')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ token: 'good', password: 'secret1' }),
    )
    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
  })

  it('rejects mismatched passwords', async () => {
    vi.mocked(validateToken).mockResolvedValue({ valid: true })
    const user = userEvent.setup()
    renderPage('good')

    await screen.findByText('Nueva contraseña')
    await user.type(screen.getByLabelText('Contraseña'), 'secret1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'secret2')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no coinciden/i)
    expect(resetPassword).not.toHaveBeenCalled()
  })
})
