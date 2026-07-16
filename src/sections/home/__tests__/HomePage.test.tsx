import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '../HomePage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { Notification } from '../actions/fetchNotifications'

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('@/sections/catalog/actions/fetchCatalogItems')
vi.mock('../actions/fetchNotifications')
vi.mock('../actions/fetchSavedCatalogs')

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '@/sections/catalog/actions/fetchCatalogItems'
import { fetchNotifications } from '../actions/fetchNotifications'
import { fetchSavedCatalogs } from '../actions/fetchSavedCatalogs'

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
  stock: 5,
  imgPath: 'https://example.com/img.jpg',
  sizes: ['M'],
  updatedOn: new Date().toISOString(),
  catalogId: 'cat1',
  ...overrides,
})

const sampleNotification = (overrides: Partial<Notification> = {}): Notification => ({
  _id: 'notif1',
  userId: 'me',
  notificationType: 'catalog-update',
  notificationAssociatedId: 'cat1',
  notificationTitle: 'Rebozos Oaxaca',
  notificationDescription: 'Tienes una nueva pregunta en tu catálogo',
  notificationStatus: 'unread',
  notificationDate: new Date().toISOString(),
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<div>Catálogo edit</div>} />
        <Route path="/catalog/:catalogId" element={<div>Catálogo público</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMyCatalog).mockResolvedValue(sampleCatalog())
  vi.mocked(fetchCatalogItems).mockResolvedValue([sampleItem()])
  vi.mocked(fetchNotifications).mockResolvedValue([])
  vi.mocked(fetchSavedCatalogs).mockResolvedValue([])
})

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
      sampleNotification({ _id: 'n1', notificationDescription: 'Primera notificación' }),
      sampleNotification({ _id: 'n2', notificationDescription: 'Segunda notificación' }),
    ])
    renderPage()

    expect(await screen.findByText('Primera notificación')).toBeInTheDocument()
    expect(screen.getByText('Segunda notificación')).toBeInTheDocument()
    expect(screen.queryByText('Nada por el momento')).not.toBeInTheDocument()
  })

  it('renders saved catalogs linking to their public view', async () => {
    vi.mocked(fetchSavedCatalogs).mockResolvedValue([
      sampleCatalog({ _id: 'saved1', userId: 'other', alias: 'Dulces La Abuela' }),
    ])
    renderPage()

    expect(await screen.findByText('Dulces La Abuela')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver catálogo dulces la abuela/i })).toHaveAttribute(
      'href',
      '/catalog/saved1',
    )
  })

  it('shows the empty saved-catalogs message when there are none', async () => {
    renderPage()

    expect(await screen.findByText(/aún no has guardado catálogos/i)).toBeInTheDocument()
  })

  it('surfaces a retryable error for a failed section without blanking the rest', async () => {
    vi.mocked(fetchNotifications).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText(/no pudimos cargar tus notificaciones/i)).toBeInTheDocument()
    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()

    vi.mocked(fetchNotifications).mockResolvedValueOnce([
      sampleNotification({ notificationDescription: 'Notificación recuperada' }),
    ])
    await userEvent.setup().click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Notificación recuperada')).toBeInTheDocument()
  })
})
