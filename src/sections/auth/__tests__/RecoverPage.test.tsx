import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoverPage } from '../RecoverPage'

vi.mock('../actions/requestRecovery')

import { requestRecovery } from '../actions/requestRecovery'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recover']}>
      <Routes>
        <Route path="/recover" element={<RecoverPage />} />
        <Route path="/login" element={<div>Inicio sesión</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecoverPage', () => {
  it('renders the recovery form in Spanish', () => {
    renderPage()
    expect(screen.getByText('Recuperar contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
  })

  it('shows confirmation screen after submitting a valid email', async () => {
    vi.mocked(requestRecovery).mockResolvedValue({ message: 'ok' })
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Correo'), 'user@admin.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    expect(requestRecovery).toHaveBeenCalledWith({ email: 'user@admin.com' })
  })

  it('shows the same confirmation screen even when the request fails (anti-enumeration)', async () => {
    vi.mocked(requestRecovery).mockRejectedValue(new Error('not found'))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Correo'), 'unknown@admin.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
  })

  it('blocks submission with an empty email', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ingresa tu correo/i)
    expect(requestRecovery).not.toHaveBeenCalled()
  })
})
