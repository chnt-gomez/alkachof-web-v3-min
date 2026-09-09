import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { JoinPage } from '../JoinPage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { ApiError } from '@/lib/api'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'

vi.mock('@/sections/publicCatalog/actions/fetchPublicCatalog')
vi.mock('@/sections/publicCatalog/actions/fetchUserSubscriptions')
vi.mock('@/sections/publicCatalog/actions/subscribe')
vi.mock('@/sections/publicCatalog/actions/unsubscribe')

const authState = vi.hoisted(() => ({ isAuthenticated: false, userId: 'user2' }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated ? { alias: 'Ana', userId: authState.userId } : null,
    isAuthenticated: authState.isAuthenticated,
    isBooting: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

import { fetchPublicCatalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { fetchUserSubscriptions } from '@/sections/publicCatalog/actions/fetchUserSubscriptions'
import { subscribe } from '@/sections/publicCatalog/actions/subscribe'
import { unsubscribe } from '@/sections/publicCatalog/actions/unsubscribe'

const mockCatalog: Catalog = {
  _id: 'abc123',
  userId: 'user1',
  alias: 'Mi Tienda Artesanal',
  welcomeText: 'Bienvenidos a nuestra tienda',
  description: 'Productos hechos a mano en Oaxaca',
  payOptions: ['cash', 'transfer'],
  deliveryType: ['location-pickup', 'shipping'],
  location: 'Oaxaca, México',
  locationZip: '68000',
  deliveryDates: [],
  deliveryLocations: [],
}

function renderPage(query = '?catalogId=abc123') {
  // A fresh QueryClient per render: the public catalog and the viewer's
  // subscriptions are cached, and a shared client would let one test read
  // another's rows.
  return render(
    withQueryClient(
      <MemoryRouter initialEntries={[`/join${query}`]}>
        <ToastProvider>
          <Routes>
            <Route path="/join" element={<JoinPage />} />
            <Route path="/catalog/:catalogId" element={<div>Catálogo público</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.isAuthenticated = false
  authState.userId = 'user2'
  vi.mocked(fetchPublicCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchUserSubscriptions).mockResolvedValue([])
  vi.mocked(subscribe).mockResolvedValue({ _id: 'sub1', userId: 'user2', catalogId: 'abc123' })
  vi.mocked(unsubscribe).mockResolvedValue(undefined)
})

describe('JoinPage', () => {
  it('renders the catalog alias and the exact static invitation line', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Mi Tienda Artesanal' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Mi Tienda Artesanal te quiere invitar a Alkachof para que veas su catálogo de productos y servicios',
      ),
    ).toBeInTheDocument()
  })

  it('renders the catalog image when present, and the placeholder when absent', async () => {
    vi.mocked(fetchPublicCatalog).mockResolvedValue({
      ...mockCatalog,
      image: 'https://example.com/tienda.jpg',
    })
    renderPage()
    const img = await screen.findByRole('img', { name: 'Mi Tienda Artesanal' })
    expect(img).toHaveAttribute('src', 'https://example.com/tienda.jpg')
  })

  it('renders the image placeholder when the catalog has no image', async () => {
    renderPage()
    expect(await screen.findByLabelText('Este catálogo aún no tiene imagen')).toBeInTheDocument()
  })

  it('shows a guest a plain link to the catalog, and no Suscribirme button', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: 'Ver catálogo' })
    expect(link).toHaveAttribute('href', '/catalog/abc123')
    expect(screen.queryByRole('button', { name: 'Suscribirme' })).not.toBeInTheDocument()
  })

  it('lets an authenticated non-owner, non-subscriber subscribe and land on the catalog', async () => {
    authState.isAuthenticated = true
    authState.userId = 'user2'
    const user = userEvent.setup()
    renderPage()

    const subscribeButton = await screen.findByRole('button', { name: 'Suscribirme' })
    await user.click(subscribeButton)

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1))
    expect(subscribe).toHaveBeenCalledWith('abc123')
    expect(await screen.findByText('Catálogo público')).toBeInTheDocument()
  })

  it('shows an already-subscribed viewer a plain link, never touching subscribe/unsubscribe', async () => {
    authState.isAuthenticated = true
    authState.userId = 'user2'
    vi.mocked(fetchUserSubscriptions).mockResolvedValue([
      { _id: 'sub1', userId: 'user2', catalogId: 'abc123' },
    ])
    renderPage()

    const link = await screen.findByRole('link', { name: 'Ver catálogo' })
    expect(link).toHaveAttribute('href', '/catalog/abc123')
    expect(subscribe).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  it('shows the owner a plain link and never checks subscription status', async () => {
    authState.isAuthenticated = true
    authState.userId = 'user1'
    renderPage()

    const link = await screen.findByRole('link', { name: 'Ver catálogo' })
    expect(link).toHaveAttribute('href', '/catalog/abc123')
    expect(fetchUserSubscriptions).not.toHaveBeenCalled()
  })

  it('keeps the viewer on the page with the button re-enabled when subscribe fails', async () => {
    authState.isAuthenticated = true
    authState.userId = 'user2'
    vi.mocked(subscribe).mockRejectedValue(new Error('No se pudo suscribir'))
    const user = userEvent.setup()
    renderPage()

    const subscribeButton = await screen.findByRole('button', { name: 'Suscribirme' })
    await user.click(subscribeButton)

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Catálogo público')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Suscribirme' })).toBeEnabled()
  })

  it('shows CatalogNotFound when fetchPublicCatalog rejects with a 404', async () => {
    vi.mocked(fetchPublicCatalog).mockRejectedValue(new ApiError('Not found', 404))
    renderPage()
    expect(await screen.findByText('Catálogo no encontrado')).toBeInTheDocument()
  })

  it('shows the error message when fetchPublicCatalog rejects generically', async () => {
    vi.mocked(fetchPublicCatalog).mockRejectedValue(new Error('Falló la red'))
    renderPage()
    expect(await screen.findByText('Falló la red')).toBeInTheDocument()
  })

  it('shows the invalid-invitation copy and skips the fetch when catalogId is missing', async () => {
    renderPage('')
    expect(await screen.findByText('Esta invitación no es válida.')).toBeInTheDocument()
    expect(fetchPublicCatalog).not.toHaveBeenCalled()
  })
})
