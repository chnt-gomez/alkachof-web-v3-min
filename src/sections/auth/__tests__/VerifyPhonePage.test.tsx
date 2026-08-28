import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VerifyPhonePage } from '../VerifyPhonePage'
import { ToastProvider } from '@/components/ui/toast'

vi.mock('../actions/verifyPhone')
vi.mock('../actions/resendPhoneCode')

import { verifyPhone } from '../actions/verifyPhone'
import { resendPhoneCode } from '../actions/resendPhoneCode'

function renderPage(state?: { email?: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/verify', state }]}>
      <ToastProvider>
        <Routes>
          <Route path="/verify" element={<VerifyPhonePage />} />
          <Route path="/login" element={<div>Inicio sesión</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VerifyPhonePage', () => {
  it('shows a success screen when the code is verified', async () => {
    vi.mocked(verifyPhone).mockResolvedValue({ message: 'Phone verified' })
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), 'a3f9c2b81d04')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByText('Teléfono verificado')).toBeInTheDocument()
    expect(verifyPhone).toHaveBeenCalledWith({ code: 'a3f9c2b81d04' })
  })

  it('shows an error when the code is invalid', async () => {
    vi.mocked(verifyPhone).mockRejectedValue(new Error('Invalid token'))
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), 'bad-code')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o expiró/i)
  })

  it('shows an email input when no email was passed in navigation state', () => {
    renderPage()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
  })

  it('lets the user resend the code', async () => {
    vi.mocked(resendPhoneCode).mockResolvedValue({ message: 'Verification code sent' })
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.click(screen.getByRole('button', { name: 'Reenviar código' }))

    expect(resendPhoneCode).toHaveBeenCalledWith({ email: 'a@b.com' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/nuevo código/i)
  })
})
