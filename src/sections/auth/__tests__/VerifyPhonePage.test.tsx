import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VerifyPhonePage } from '../VerifyPhonePage'
import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'

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

    await user.type(screen.getByLabelText('Código de verificación'), '043532')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByText('Teléfono verificado')).toBeInTheDocument()
    expect(verifyPhone).toHaveBeenCalledWith({ email: 'a@b.com', code: '043532' })
  })

  it('only accepts digits in the code field, up to 6', async () => {
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), 'ab12cd34ef')
    expect(screen.getByLabelText('Código de verificación')).toHaveValue('1234')
  })

  it('shows an error when the code is invalid', async () => {
    vi.mocked(verifyPhone).mockRejectedValue(new ApiError('Invalid token', 400))
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o expiró/i)
  })

  it('shows the destroyed-code state after too many wrong attempts', async () => {
    vi.mocked(verifyPhone).mockRejectedValue(
      new ApiError('Too many incorrect attempts. Request a new code.', 400, {
        message: 'Too many incorrect attempts. Request a new code.',
        codeDestroyed: true,
      }),
    )
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByText('Código bloqueado')).toBeInTheDocument()
  })

  it('shows a rate-limit message on 429', async () => {
    vi.mocked(verifyPhone).mockRejectedValue(new ApiError('Too many requests', 429))
    const user = userEvent.setup()
    renderPage({ email: 'a@b.com' })

    await user.type(screen.getByLabelText('Código de verificación'), '999999')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/demasiados intentos/i)
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
