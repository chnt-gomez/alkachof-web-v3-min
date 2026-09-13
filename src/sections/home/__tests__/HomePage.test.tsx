import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '../HomePage'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NotificationsProvider } from '@/sections/notifications/context/NotificationsContext'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { Notification } from '@/sections/notifications/actions/fetchNotifications'

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('@/sections/catalog/actions/fetchCatalogItems')
vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('@/sections/notifications/liveSocket')
vi.mock('@/sections/notifications/actions/fetchNotifications', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/sections/notifications/actions/fetchNotifications')
  >()),
  fetchNotifications: vi.fn(),
  fetchAllNotifications: vi.fn(),
  markNotificationSeen: vi.fn(),
}))
vi.mock('../actions/fetchSavedCatalogs')
vi.mock('../actions/fetchNews')

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'
import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { fetchNotifications } from '@/sections/notifications/actions/fetchNotifications'
import { fetchSavedCatalogs } from '../actions/fetchSavedCatalogs'
import { fetchNews } from '../actions/fetchNews'
import type { News } from '../actions/fetchNews'

const sampleCatalog = (overrides: Partial<Catalog> = {}): Catalog => ({
  _id: 'cat1',
  userId: 'me',
  alias: 'Tienda de Prueba',
  welcomeText: 'Bienvenidos',
  description: 'Descripción de prueba',
  payOptions: ['cash'],
  deliveryType: ['delivery'],
  location: 'Oaxaca, México',
  locationZip: '68000',
  deliveryDates: [],
  deliveryLocations: [],
  ...overrides,
})

const sampleItem = (overrides: Partial<Item> = {}): Item => ({
  _id: 'item1',
  name: 'Blusa Artesanal',
  description: 'Tejido a mano',
  price: 350,
  imgPath: 'https://example.com/img.jpg',
  outOfStock: false,
  updatedOn: new Date().toISOString(),
  catalogId: 'cat1',
  ...overrides,
})

const sampleNews = (overrides: Partial<News> = {}): News => ({
  _id: 'news1',
  date: new Date().toISOString(),
  title: 'Nuevas opciones de pago',
  message: 'Ya puedes aceptar transferencias.',
  ...overrides,
})

const sampleNotification = (overrides: Partial<Notification> = {}): Notification => ({
  _id: 'notif1',
  userId: 'me',
  message: 'Rebozos Oaxaca: ¡Nuevos rebozos de temporada ya disponibles!',
  metadata: { navigationUrl: '/catalog/cat1' },
  createdOn: new Date().toISOString(),
  seenOn: false,
  ...overrides,
})

// HomePage reads notifications from NotificationsProvider, which activates on
// login — so the page renders inside real providers with an authenticated
// session (seeded token + mocked fetchProfile), never a mocked context.
function renderPage(initialEntry = '/') {
  // A fresh client per render: the catalog and its items are cached, and a
  // client shared across tests would answer one test's query from another's.
  return render(
    withQueryClient(
      <MemoryRouter initialEntries={[initialEntry]}>
        <ToastProvider>
          <AuthProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<div>Catálogo edit</div>} />
                <Route path="/catalog/:catalogId" element={<div>Catálogo público</div>} />
              </Routes>
            </NotificationsProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('alk.token', 'test-token')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'me', alias: 'Yo' })
  vi.mocked(fetchMyCatalog).mockResolvedValue(sampleCatalog())
  vi.mocked(fetchCatalogItems).mockResolvedValue([sampleItem()])
  vi.mocked(fetchNotifications).mockResolvedValue([])
  vi.mocked(fetchNews).mockResolvedValue([])
  vi.mocked(fetchSavedCatalogs).mockResolvedValue([])
})

afterEach(() => {
  localStorage.clear()
})

/** Home opens on "Mis cosas"; buy-side content lives behind the Comprar tab. */
async function openComprar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Comprar' }))
}

describe('HomePage', () => {
  it('links to the owner catalog editor from the my-catalog card', async () => {
    renderPage()

    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /abrir mi catálogo tienda de prueba/i }),
    ).toHaveAttribute('href', '/catalog')
  })

  it('invites the seller to start selling when the catalog has no products', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Empieza a vender en Alkachof')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /agregar productos/i })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })

  it('hides the start-selling invite when the catalog already has products', async () => {
    renderPage()

    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()
    expect(screen.queryByText('Empieza a vender en Alkachof')).not.toBeInTheDocument()
  })

  it('shows the empty notifications message when there are none', async () => {
    renderPage()

    expect(await screen.findByText('Nada por el momento')).toBeInTheDocument()
  })

  it('renders notifications when there are some', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      sampleNotification({ _id: 'n1', message: 'Primera notificación' }),
      sampleNotification({ _id: 'n2', message: 'Segunda notificación' }),
    ])
    renderPage()

    expect(await screen.findByText('Primera notificación')).toBeInTheDocument()
    expect(screen.getByText('Segunda notificación')).toBeInTheDocument()
    expect(screen.queryByText('Nada por el momento')).not.toBeInTheDocument()
  })

  it('shows the empty news message when there are none', async () => {
    renderPage()

    expect(await screen.findByText('No hay noticias por el momento')).toBeInTheDocument()
  })

  it('opens a dialog with the full announcement when a news row is tapped', async () => {
    vi.mocked(fetchNews).mockResolvedValue([
      sampleNews({
        _id: 'na',
        title: 'Mantenimiento programado',
        message: 'La plataforma estará en mantenimiento el sábado.',
      }),
    ])
    renderPage()

    await userEvent.setup().click(
      await screen.findByRole('button', { name: /mantenimiento programado/i }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('La plataforma estará en mantenimiento el sábado.'),
    ).toBeInTheDocument()
  })

  it('renders saved catalogs linking to their public view', async () => {
    vi.mocked(fetchSavedCatalogs).mockResolvedValue([
      sampleCatalog({ _id: 'saved1', userId: 'other', alias: 'Dulces La Abuela' }),
    ])
    const user = userEvent.setup()
    renderPage()
    await openComprar(user)

    expect(await screen.findByText('Dulces La Abuela')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver catálogo dulces la abuela/i })).toHaveAttribute(
      'href',
      '/catalog/saved1',
    )
  })

  it('shows the empty saved-catalogs message when there are none', async () => {
    const user = userEvent.setup()
    renderPage()
    await openComprar(user)

    expect(await screen.findByText(/aún no tienes catálogos guardados/i)).toBeInTheDocument()
  })

  it('surfaces a retryable error for a failed section without blanking the rest', async () => {
    vi.mocked(fetchNotifications).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText(/no pudimos cargar tus notificaciones/i)).toBeInTheDocument()
    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()

    vi.mocked(fetchNotifications).mockResolvedValueOnce([
      sampleNotification({ message: 'Notificación recuperada' }),
    ])
    await userEvent.setup().click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Notificación recuperada')).toBeInTheDocument()
  })
})

describe('HomePage tabs', () => {
  it('opens on Mis cosas with the seller sections visible', async () => {
    renderPage()

    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mis cosas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogos guardados' })).not.toBeInTheDocument()
  })

  it('swaps the panels when Comprar is selected', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Tienda de Prueba')

    await openComprar(user)

    expect(await screen.findByRole('heading', { name: 'Catálogos guardados' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mi catálogo' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveAttribute('aria-selected', 'true')
  })

  it('does not load saved catalogs until Comprar is opened', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Tienda de Prueba')

    expect(fetchSavedCatalogs).not.toHaveBeenCalled()

    await openComprar(user)

    await waitFor(() => expect(fetchSavedCatalogs).toHaveBeenCalledTimes(1))
  })

  it('does not refetch a tab that has already been opened', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Tienda de Prueba')

    await openComprar(user)
    await waitFor(() => expect(fetchSavedCatalogs).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('tab', { name: 'Mis cosas' }))
    await screen.findByRole('heading', { name: 'Mi catálogo' })
    await openComprar(user)
    await screen.findByRole('heading', { name: 'Catálogos guardados' })

    expect(fetchSavedCatalogs).toHaveBeenCalledTimes(1)
    expect(fetchMyCatalog).toHaveBeenCalledTimes(1)
  })

  it('opens straight on Comprar when the url asks for it', async () => {
    renderPage('/?tab=comprar')

    expect(await screen.findByRole('heading', { name: 'Catálogos guardados' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveAttribute('aria-selected', 'true')
    // Mis cosas stays unloaded until opened.
    expect(fetchMyCatalog).not.toHaveBeenCalled()
  })

  it('decorates the Comprar tab with the buy signature color when active', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Tienda de Prueba')

    const comprar = screen.getByRole('tab', { name: 'Comprar' })
    expect(comprar.className).not.toMatch(/bg-buy/)

    await openComprar(user)

    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveClass('bg-buy', 'text-buy-ink')
  })
})

describe('MyCatalogCard', () => {
  it('shows the article count for a catalog with items', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([
      sampleItem({ _id: 'i1' }),
      sampleItem({ _id: 'i2' }),
      sampleItem({ _id: 'i3' }),
    ])
    renderPage()

    expect(await screen.findByText('3 artículos')).toBeInTheDocument()
  })

  it('keeps the count singular for a catalog with one item', async () => {
    renderPage()

    expect(await screen.findByText('1 artículo')).toBeInTheDocument()
  })

  it('says so when the catalog holds nothing yet', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Sin artículos todavía')).toBeInTheDocument()
  })

  it('outlines the card in the green signature color', async () => {
    renderPage()

    const link = await screen.findByRole('link', { name: /abrir mi catálogo/i })
    expect(link).toHaveClass('border-2', 'border-primary')
  })

  it('falls back to the invitation copy when the catalog has no image and no name', async () => {
    vi.mocked(fetchMyCatalog).mockResolvedValue(sampleCatalog({ alias: '', description: '' }))
    renderPage()

    expect(await screen.findByText('Este es tu espacio para vender')).toBeInTheDocument()
    expect(
      screen.getByText('Cuando quieras publicar algo lo podrás hacer aquí'),
    ).toBeInTheDocument()
    // The link still has a usable name without the alias.
    expect(screen.getByRole('link', { name: 'Abrir mi catálogo' })).toBeInTheDocument()
  })

  it('keeps the real name once the catalog has one', async () => {
    vi.mocked(fetchMyCatalog).mockResolvedValue(sampleCatalog({ alias: 'Tienda de Prueba' }))
    renderPage()

    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()
    expect(screen.queryByText('Este es tu espacio para vender')).not.toBeInTheDocument()
  })

  it('renders the catalog image large when there is one', async () => {
    vi.mocked(fetchMyCatalog).mockResolvedValue(
      sampleCatalog({ image: 'https://cdn.test/tienda.png' }),
    )
    const { container } = renderPage()

    await screen.findByText('Tienda de Prueba')
    const img = container.querySelector('img[src="https://cdn.test/tienda.png"]')
    expect(img?.parentElement).toHaveClass('h-20', 'w-20')
  })
})
