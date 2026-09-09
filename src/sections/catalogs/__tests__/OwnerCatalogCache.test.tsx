import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NotificationsProvider } from '@/sections/notifications/context/NotificationsContext'
import { HomePage } from '@/sections/home/HomePage'
import { CatalogPage } from '@/sections/catalog/CatalogPage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

/*
  The owner's catalog and its items are read by two screens that used to load
  them independently: Home's "Mi catálogo" tile and the catalog editor. Moving
  between them re-read rows that had not changed — four requests for two rows on
  a single round trip.

  These are the tests that hold that shut. They assert on how many times the
  *action* was called, which is the only thing the epic is actually about.
*/

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
vi.mock('@/sections/home/actions/fetchSavedCatalogs')
vi.mock('@/sections/home/actions/fetchNews')
vi.mock('@/sections/catalog/actions/deleteItem')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogLocation')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogQuestions')
vi.mock('@/sections/catalog/actions/fetchInstagramStatus')

import { fetchMyCatalog } from '../actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'
import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { fetchNotifications } from '@/sections/notifications/actions/fetchNotifications'
import { fetchSavedCatalogs } from '@/sections/home/actions/fetchSavedCatalogs'
import { fetchNews } from '@/sections/home/actions/fetchNews'
import { deleteItem } from '@/sections/catalog/actions/deleteItem'
import { fetchCatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { fetchCatalogQuestions } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { fetchInstagramStatus } from '@/sections/catalog/actions/fetchInstagramStatus'

const mockCatalog: Catalog = {
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
}

const mockItems: Item[] = [
  {
    _id: 'item1',
    name: 'Bolsa tejida',
    description: 'Hecha a mano',
    price: 35000,
    imgPath: '',
    outOfStock: false,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'cat1',
  },
]

/** Both screens under one client, with links so a test can move between them. */
function renderApp(initialEntry = '/') {
  return render(
    withQueryClient(
      <MemoryRouter initialEntries={[initialEntry]}>
        <ToastProvider>
          <AuthProvider>
            <NotificationsProvider>
              <nav>
                <Link to="/">Ir a Inicio</Link>
                <Link to="/catalog">Ir a Catálogo</Link>
              </nav>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
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
  vi.mocked(fetchNotifications).mockResolvedValue([])
  vi.mocked(fetchNews).mockResolvedValue([])
  vi.mocked(fetchSavedCatalogs).mockResolvedValue([])
  vi.mocked(fetchMyCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])
  vi.mocked(fetchInstagramStatus).mockResolvedValue({
    enrolled: false, available: true, nextAvailable: null, cooldownDays: 7,
  })
  vi.mocked(deleteItem).mockResolvedValue(undefined)
})

describe('owner catalog cache', () => {
  // The headline of the epic: Inicio → Catálogo → Inicio used to cost six reads
  // of two rows. Both screens now land on the same two cache entries.
  it('reads the catalog and its items once across Inicio → Catálogo → Inicio', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await screen.findByRole('heading', { name: 'Mi catálogo' })
    await waitFor(() => expect(fetchMyCatalog).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('link', { name: 'Ir a Catálogo' }))
    await screen.findByRole('button', { name: 'Agregar artículo' })

    await user.click(screen.getByRole('link', { name: 'Ir a Inicio' }))
    await screen.findByRole('heading', { name: 'Mi catálogo' })

    expect(fetchMyCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
  })

  // The editor's provider unmounts with the route, so this is the case that used
  // to refetch unconditionally on every visit.
  it('does not re-read anything when the catalog editor is reopened', async () => {
    const user = userEvent.setup()
    renderApp('/catalog')

    await screen.findByRole('button', { name: 'Agregar artículo' })
    expect(fetchMyCatalog).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('link', { name: 'Ir a Inicio' }))
    await screen.findByRole('heading', { name: 'Mi catálogo' })
    await user.click(screen.getByRole('link', { name: 'Ir a Catálogo' }))

    // Straight to the content: with both rows cached there is no loading state
    // to pass through, which is the user-visible half of this change.
    expect(screen.queryByText('Cargando catálogo…')).not.toBeInTheDocument()
    await screen.findByRole('button', { name: 'Agregar artículo' })
    expect(fetchMyCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
  })

  // A mutation holds the API's own answer, so it writes the cache. Re-reading
  // the list to learn what we were just told is the habit this epic removes.
  it('writes a deletion into the cache instead of re-reading the list', async () => {
    const user = userEvent.setup()
    renderApp('/catalog')

    await screen.findByText('Bolsa tejida')
    await user.click(screen.getByRole('button', { name: 'Eliminar Bolsa tejida' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(screen.queryByText('Bolsa tejida')).not.toBeInTheDocument())
    expect(deleteItem).toHaveBeenCalledWith('item1')
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)

    // And the deletion is what Home reports, without a read of its own.
    await user.click(screen.getByRole('link', { name: 'Ir a Inicio' }))
    await screen.findByRole('heading', { name: 'Mi catálogo' })
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
  })
})
