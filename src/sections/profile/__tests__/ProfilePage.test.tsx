import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from '../ProfilePage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import type { Profile } from '@/sections/auth/types'

vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('@/sections/auth/actions/updateProfile')
vi.mock('@/sections/auth/actions/uploadProfileImage')

import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { updateProfile } from '@/sections/auth/actions/updateProfile'

const sampleProfile = (overrides: Partial<Profile> = {}): Profile => ({
  _id: 'profile1',
  userId: 'user1',
  alias: 'artesano_mx',
  profileDescription: 'Vendo artesanías hechas a mano',
  phoneCountry: '+52',
  phoneContact: '5512345678',
  profile_picture_url: 'https://example.com/foto.jpg',
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('alk.token', 'test-token')
  vi.mocked(fetchProfile).mockResolvedValue(sampleProfile())
  vi.mocked(updateProfile).mockImplementation((_id, patch) =>
    Promise.resolve(sampleProfile(patch))
  )
})

afterEach(() => {
  localStorage.clear()
})

describe('ProfilePage', () => {
  it('renders the profile fields', async () => {
    renderPage()

    expect(await screen.findByText('artesano_mx')).toBeInTheDocument()
    expect(screen.getByText('Vendo artesanías hechas a mano')).toBeInTheDocument()
    expect(screen.getByText('+52 5512345678')).toBeInTheDocument()
  })

  it('falls back to a dash when a field is empty', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(
      sampleProfile({ profileDescription: '', phoneCountry: '', phoneContact: '' })
    )
    renderPage()

    expect(await screen.findByText('artesano_mx')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('opens the edit screen prefilled with the current values', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Editar perfil'))

    const dialog = screen.getByRole('dialog', { name: 'Editar perfil' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej. artesano_mx')).toHaveValue('artesano_mx')
    expect(screen.getByLabelText('Número de teléfono')).toHaveValue('5512345678')
  })

  it('saves the changed fields and shows them on the page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Editar perfil'))

    const aliasInput = screen.getByPlaceholderText('Ej. artesano_mx')
    await user.clear(aliasInput)
    await user.type(aliasInput, 'tejidos_oaxaca')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith('profile1', { alias: 'tejidos_oaxaca' })
    })
    expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument()
    expect(await screen.findByText('tejidos_oaxaca')).toBeInTheDocument()
  })

  it('does not call the backend when nothing changed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Editar perfil'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument()
    })
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('does not send a cleared field, since the backend cannot blank it', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Editar perfil'))

    await user.clear(screen.getByPlaceholderText('Ej. Vendo artesanías hechas a mano'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument()
    })
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('shows an error when the save fails and keeps the screen open', async () => {
    const user = userEvent.setup()
    vi.mocked(updateProfile).mockRejectedValue(new Error('No eres el dueño del perfil'))
    renderPage()

    await user.click(await screen.findByLabelText('Editar perfil'))

    const aliasInput = screen.getByPlaceholderText('Ej. artesano_mx')
    await user.clear(aliasInput)
    await user.type(aliasInput, 'otro_alias')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No eres el dueño del perfil')
    expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeInTheDocument()
  })
})
