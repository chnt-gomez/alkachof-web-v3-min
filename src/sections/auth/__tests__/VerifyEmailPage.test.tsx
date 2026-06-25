import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VerifyEmailPage } from '../VerifyEmailPage'

vi.mock('../actions/validateToken')

import { validateToken } from '../actions/validateToken'

function renderPage(token = 'good-token') {
  return render(
    <MemoryRouter initialEntries={[`/verify/${token}`]}>
      <Routes>
        <Route path="/verify/:token" element={<VerifyEmailPage />} />
        <Route path="/login" element={<div>Inicio sesión</div>} />
        <Route path="/signup" element={<div>Crear cuenta</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VerifyEmailPage', () => {
  it('shows a success screen when the token validates', async () => {
    vi.mocked(validateToken).mockResolvedValue({ valid: true })
    renderPage('good')
    expect(await screen.findByText('Cuenta activada')).toBeInTheDocument()
    expect(validateToken).toHaveBeenCalledWith('good')
  })

  it('shows an error screen when the token is rejected', async () => {
    vi.mocked(validateToken).mockRejectedValue(new Error('bad'))
    renderPage('bad')
    expect(await screen.findByText('No pudimos activar tu cuenta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a registrarse' })).toBeInTheDocument()
  })
})
