import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicCatalogPage } from '../PublicCatalogPage'
import type { Catalog } from '../actions/fetchPublicCatalog'
import type { Item } from '../actions/fetchCatalogItems'
import { ApiError } from '@/lib/api'

vi.mock('../actions/fetchPublicCatalog')
vi.mock('../actions/fetchCatalogItems')

import { fetchPublicCatalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'

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

const mockItems: Item[] = [
  {
    _id: 'item1',
    name: 'Bolsa tejida',
    description: 'Hecha a mano con lana natural',
    price: 35000,
    stock: 5,
    imgPath: 'https://example.com/bolsa.jpg',
    sizes: ['Único'],
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'abc123',
  },
  {
    _id: 'item2',
    name: 'Aretes de plata',
    description: '',
    price: 12000,
    stock: 0,
    imgPath: '',
    sizes: [],
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'abc123',
  },
]

function renderPage(catalogId = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/public/catalog/${catalogId}`]}>
      <Routes>
        <Route path="/public/catalog/:catalogId" element={<PublicCatalogPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchPublicCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
})

describe('PublicCatalogPage', () => {
  it('shows loading state before data resolves', () => {
    vi.mocked(fetchPublicCatalog).mockReturnValue(new Promise(() => {}))
    vi.mocked(fetchCatalogItems).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Cargando catálogo…')).toBeInTheDocument()
  })

  it('renders catalog alias and welcome text', async () => {
    renderPage()

    expect(await screen.findByText('Mi Tienda Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Bienvenidos a nuestra tienda')).toBeInTheDocument()
  })

  it('renders catalog description and location', async () => {
    renderPage()

    expect(await screen.findByText('Productos hechos a mano en Oaxaca')).toBeInTheDocument()
    expect(screen.getByText('Oaxaca, México')).toBeInTheDocument()
  })

  it('renders all catalog items', async () => {
    renderPage()

    expect(await screen.findByText('Bolsa tejida')).toBeInTheDocument()
    expect(screen.getByText('Aretes de plata')).toBeInTheDocument()
  })

  it('shows out-of-stock label on item card', async () => {
    renderPage()

    // card list renders "Sin existencias" badge directly for stock=0 items
    expect(await screen.findByText('Sin existencias')).toBeInTheDocument()
  })

  it('shows stock count inside product detail dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))

    expect(screen.getByText('5 disponibles')).toBeInTheDocument()
  })

  it('renders empty state when catalog has no items', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Sin productos aún.')).toBeInTheDocument()
  })

  it('renders error message when the request fails', async () => {
    vi.mocked(fetchPublicCatalog).mockRejectedValue(new Error('Falla de red'))
    renderPage()

    expect(await screen.findByText('Falla de red')).toBeInTheDocument()
  })

  it('renders the not-found view when the catalog returns 404', async () => {
    vi.mocked(fetchPublicCatalog).mockRejectedValue(new ApiError('Not found', 404))
    vi.mocked(fetchCatalogItems).mockRejectedValue(new ApiError('Not found', 404))
    renderPage('does-not-exist')

    expect(await screen.findByText('Catálogo no encontrado')).toBeInTheDocument()
  })

  it('renders the subscribe button in the jumbotron', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /suscribirme/i })).toBeInTheDocument()
  })

  it('opens product detail dialog when an item card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const card = await screen.findByRole('button', { name: /bolsa tejida/i })
    await user.click(card)

    // card thumbnail + dialog image both render; description/sizes are dialog-only
    expect(screen.getAllByRole('img', { name: /bolsa tejida/i })).toHaveLength(2)
    expect(screen.getByText('Hecha a mano con lana natural')).toBeInTheDocument()
    expect(screen.getAllByText('$350.00')).toHaveLength(2) // card + dialog
    expect(screen.getByText('5 disponibles')).toBeInTheDocument()
    expect(screen.getByText('Único')).toBeInTheDocument()
  })

  it('closes the product detail dialog when the close button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const card = await screen.findByRole('button', { name: /bolsa tejida/i })
    await user.click(card)

    await user.click(screen.getByRole('button', { name: /cerrar/i }))

    expect(screen.queryByText('Hecha a mano con lana natural')).not.toBeInTheDocument()
  })

  it('closes the product detail dialog when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const card = await screen.findByRole('button', { name: /bolsa tejida/i })
    await user.click(card)

    // click the backdrop (the outermost dialog overlay)
    await user.click(screen.getByText('Hecha a mano con lana natural').closest('[class*="fixed"]')!)

    expect(screen.queryByText('Hecha a mano con lana natural')).not.toBeInTheDocument()
  })

  it('renders product images with object-contain to preserve aspect ratio', async () => {
    renderPage()

    const img = await screen.findByRole('img', { name: /bolsa tejida/i })
    expect(img).toHaveClass('object-contain')
    expect(img.className).not.toMatch(/object-cover/)
  })
})
