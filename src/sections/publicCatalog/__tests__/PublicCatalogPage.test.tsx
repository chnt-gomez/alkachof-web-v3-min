import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicCatalogPage } from '../PublicCatalogPage'
import type { Catalog } from '../actions/fetchPublicCatalog'
import type { Item } from '../actions/fetchCatalogItems'

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
    imgPath: '',
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

  it('renders stock availability and out-of-stock states', async () => {
    renderPage()

    expect(await screen.findByText('5 disponibles')).toBeInTheDocument()
    expect(screen.getByText('Sin existencias')).toBeInTheDocument()
  })

  it('renders empty state when catalog has no items', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Sin productos aún.')).toBeInTheDocument()
  })

  it('renders error message when the request fails', async () => {
    vi.mocked(fetchPublicCatalog).mockRejectedValue(new Error('Catalog not found (404)'))
    renderPage()

    expect(await screen.findByText('Catalog not found (404)')).toBeInTheDocument()
  })
})
