import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { withQueryClient } from '@/test/renderWithProviders'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'
import { useMyCatalog } from '@/sections/catalogs/hooks/useOwnerCatalog'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

/*
  The query cache is module-scope, so it outlives the React tree — which is what
  makes it useful and what makes logout a security boundary rather than
  housekeeping. Two users on one phone is an ordinary case for this product.
*/

vi.mock('../actions/fetchProfile')
vi.mock('../actions/login')
vi.mock('@/sections/catalogs/actions/fetchMyCatalog')

import { fetchProfile } from '../actions/fetchProfile'
import { login as loginAction } from '../actions/login'
import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'

const catalogOf = (alias: string): Catalog => ({
  _id: `cat-${alias}`,
  userId: alias,
  alias,
  welcomeText: '',
  description: '',
  payOptions: [],
  deliveryType: [],
  location: '',
  locationZip: '',
  deliveryDates: [],
  deliveryLocations: [],
})

/** Shows what the session currently holds, and can end or start one. */
function Probe() {
  const { profile, isBooting, logout, login, updateProfile } = useAuth()
  const catalog = useMyCatalog(Boolean(profile))

  if (isBooting) return <p>Cargando sesión…</p>

  return (
    <div>
      <p>Perfil: {profile?.alias ?? 'ninguno'}</p>
      <p>Catálogo: {catalog.data?.alias ?? 'ninguno'}</p>
      <button onClick={logout}>Cerrar sesión</button>
      <button onClick={() => void login({ email: 'user2@admin.com', password: 'password' })}>
        Entrar como user2
      </button>
      <button onClick={() => updateProfile({ alias: 'Alias nuevo' })}>Renombrar</button>
    </div>
  )
}

function renderProbe() {
  return render(
    withQueryClient(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('alk.token', 'token-user1')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Ana' })
  vi.mocked(fetchMyCatalog).mockResolvedValue(catalogOf('Tienda de Ana'))
  vi.mocked(loginAction).mockResolvedValue({ token: 'token-user2', refreshToken: 'r2' })
})

describe('auth cache', () => {
  // The whole point of caching the profile: the boot read happens once.
  it('reads the profile once for the session', async () => {
    renderProbe()

    expect(await screen.findByText('Perfil: Ana')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(1)
  })

  // Emptying the cache must not read like a reason to refill it. The session is
  // over; a `/profile` call here would answer 401 and nothing would want it.
  it('does not re-read the profile when the session ends', async () => {
    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Perfil: Ana')

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText('Perfil: ninguno')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(1)
    expect(fetchMyCatalog).toHaveBeenCalledTimes(1)
  })

  // Security, not performance: the next user on this phone must not inherit the
  // previous one's rows.
  it('drops the previous session rows so the next user cannot see them', async () => {
    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Catálogo: Tienda de Ana')

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await screen.findByText('Perfil: ninguno')
    // Nothing of the first seller survives the logout, catalog included.
    expect(screen.getByText('Catálogo: ninguno')).toBeInTheDocument()

    vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p2', userId: 'user2', alias: 'Beto' })
    vi.mocked(fetchMyCatalog).mockResolvedValue(catalogOf('Tienda de Beto'))

    await user.click(screen.getByRole('button', { name: 'Entrar como user2' }))

    expect(await screen.findByText('Perfil: Beto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Catálogo: Tienda de Beto')).toBeInTheDocument())
    expect(fetchProfile).toHaveBeenCalledTimes(2)
  })

  // `updateProfile` receives what the API already returned, so it is a cache
  // write. Re-reading /profile to learn what we were just told is the habit
  // this epic removes.
  it('writes a profile edit into the cache instead of re-reading it', async () => {
    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Perfil: Ana')

    await user.click(screen.getByRole('button', { name: 'Renombrar' }))

    expect(await screen.findByText('Perfil: Alias nuevo')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(1)
  })
})
