import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

vi.mock('../actions/fetchEditableCatalog')
vi.mock('../actions/updateCatalog')
vi.mock('../actions/updateItem')
vi.mock('../actions/createItem')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogItems')

import { fetchEditableCatalog } from '../actions/fetchEditableCatalog'
import { updateCatalog } from '../actions/updateCatalog'
import { updateItem } from '../actions/updateItem'
import { createItem } from '../actions/createItem'
import { fetchCatalogItems } from '@/sections/publicCatalog/actions/fetchCatalogItems'

const mockCatalog: Catalog = {
  _id: 'cat1',
  userId: 'user1',
  alias: 'Tienda de Prueba',
  welcomeText: 'Bienvenidos',
  description: 'Descripción de prueba',
  payOptions: ['cash', 'transfer'],
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
    stock: 5,
    imgPath: 'https://example.com/bolsa.jpg',
    sizes: ['Único'],
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'cat1',
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
    catalogId: 'cat1',
  },
]

function renderPage(catalogId = 'cat1') {
  return render(
    <MemoryRouter initialEntries={[`/edit/catalog/${catalogId}`]}>
      <Routes>
        <Route path="/edit/catalog/:catalogId" element={<CatalogPage />} />
        <Route path="/catalog/:catalogId" element={<div>Vista pública</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchEditableCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(updateCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(updateItem).mockImplementation(async (itemId, patch) => ({
    ...mockItems.find((i) => i._id === itemId)!,
    ...patch,
  }))
  vi.mocked(createItem).mockResolvedValue({
    _id: 'item_new',
    catalogId: 'cat1',
    name: 'Nuevo producto',
    description: '',
    price: 10000,
    stock: 1,
    imgPath: '',
    sizes: [],
    updatedOn: new Date().toISOString(),
  })
})

describe('CatalogPage', () => {
  it('shows loading state before data resolves', () => {
    vi.mocked(fetchEditableCatalog).mockReturnValue(new Promise(() => {}))
    vi.mocked(fetchCatalogItems).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Cargando catálogo…')).toBeInTheDocument()
  })

  it('renders catalog alias and welcome text', async () => {
    renderPage()
    expect(await screen.findByText('Tienda de Prueba')).toBeInTheDocument()
    expect(screen.getByText('Bienvenidos')).toBeInTheDocument()
  })

  it('renders catalog description and location', async () => {
    renderPage()
    expect(await screen.findByText('Descripción de prueba')).toBeInTheDocument()
    expect(screen.getByText('Oaxaca, México')).toBeInTheDocument()
  })

  it('renders a link to the public catalog view', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /ver catálogo/i })
    expect(link).toHaveAttribute('href', '/catalog/cat1')
  })

  it('renders all products in the grid', async () => {
    renderPage()
    expect(await screen.findByText('Bolsa tejida')).toBeInTheDocument()
    expect(screen.getByText('Aretes de plata')).toBeInTheDocument()
  })

  it('shows out-of-stock label on product cards with no stock', async () => {
    renderPage()
    expect(await screen.findByText('Sin existencias')).toBeInTheDocument()
  })

  it('opens edit product modal when a product card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))

    expect(screen.getByText('Editar producto')).toBeInTheDocument()
  })

  it('closes edit product modal on cancel', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByText('Editar producto')).not.toBeInTheDocument()
  })

  it('opens add product modal when agregar producto is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar producto/i }))

    expect(screen.getByText('Nuevo producto')).toBeInTheDocument()
  })

  it('opens edit catalog modal when the pencil button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /editar catálogo/i }))

    expect(screen.getByText('Editar catálogo')).toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetchEditableCatalog).mockRejectedValue(new Error('Error de red'))
    renderPage()
    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })

  it('renders product images with object-contain', async () => {
    renderPage()
    const img = await screen.findByRole('img', { name: /bolsa tejida/i })
    expect(img).toHaveClass('object-contain')
    expect(img.className).not.toMatch(/object-cover/)
  })
})
