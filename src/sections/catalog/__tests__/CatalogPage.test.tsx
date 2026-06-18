import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

vi.mock('@/sections/catalogs/actions/fetchCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/updateCatalog')
vi.mock('../actions/updateItem')
vi.mock('../actions/createItem')

import { fetchCatalog } from '@/sections/catalogs/actions/fetchCatalog'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { updateCatalog } from '../actions/updateCatalog'
import { updateItem } from '../actions/updateItem'
import { createItem } from '../actions/createItem'

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
  vi.mocked(fetchCatalog).mockResolvedValue(mockCatalog)
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
    vi.mocked(fetchCatalog).mockReturnValue(new Promise(() => {}))
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
    vi.mocked(fetchCatalog).mockRejectedValue(new Error('Error de red'))
    renderPage()
    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })

  it('renders product images with object-contain', async () => {
    renderPage()
    const img = await screen.findByRole('img', { name: /bolsa tejida/i })
    expect(img).toHaveClass('object-contain')
    expect(img.className).not.toMatch(/object-cover/)
  })

  it('saves catalog edits via POST /catalog/:id/update and closes the modal', async () => {
    vi.mocked(updateCatalog).mockImplementation(async (_id, patch) => ({ ...mockCatalog, ...patch }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /editar catálogo/i }))

    const aliasInput = screen.getByDisplayValue('Tienda de Prueba')
    await user.clear(aliasInput)
    await user.type(aliasInput, 'Mi Tienda Nueva')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(updateCatalog).toHaveBeenCalledWith('cat1', expect.objectContaining({ alias: 'Mi Tienda Nueva' }))
    expect(await screen.findByText('Mi Tienda Nueva')).toBeInTheDocument()
    expect(screen.queryByText('Editar catálogo')).not.toBeInTheDocument()
  })

  it('rolls back optimistic catalog update when the save fails', async () => {
    vi.mocked(updateCatalog).mockRejectedValue(new Error('Falla del servidor'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /editar catálogo/i }))

    const aliasInput = screen.getByDisplayValue('Tienda de Prueba')
    await user.clear(aliasInput)
    await user.type(aliasInput, 'Nombre Temporal')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falla del servidor')
    expect(screen.getByRole('heading', { name: 'Tienda de Prueba' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nombre Temporal' })).not.toBeInTheDocument()
  })

  it('shows an empty-state CTA when the catalog has no products', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/aún no tienes productos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar primer producto/i })).toBeInTheDocument()
  })
})
