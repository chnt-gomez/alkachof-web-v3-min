import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import { ToastProvider } from '@/components/ui/toast'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/updateCatalog')
vi.mock('../actions/updateItem')
vi.mock('../actions/createItem')
vi.mock('../actions/deleteItem')
vi.mock('../actions/uploadItemImage')
vi.mock('../actions/broadcastCatalog')

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { updateCatalog } from '../actions/updateCatalog'
import { updateItem } from '../actions/updateItem'
import { createItem } from '../actions/createItem'
import { deleteItem } from '../actions/deleteItem'
import { uploadItemImage } from '../actions/uploadItemImage'
import { broadcastCatalog } from '../actions/broadcastCatalog'

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

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/catalog']}>
        <Routes>
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:catalogId" element={<div>Vista pública</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMyCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(updateCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(updateItem).mockImplementation(async (itemId, patch) => ({
    ...mockItems.find((i) => i._id === itemId)!,
    ...patch,
  }))
  vi.mocked(deleteItem).mockResolvedValue(undefined)
  vi.mocked(uploadItemImage).mockResolvedValue('https://example.com/uploaded.png')
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
  vi.mocked(broadcastCatalog).mockResolvedValue({ ok: true })
})

describe('CatalogPage', () => {
  it('shows loading state before data resolves', () => {
    vi.mocked(fetchMyCatalog).mockReturnValue(new Promise(() => {}))
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

    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))

    expect(screen.getByText('Editar producto')).toBeInTheDocument()
  })

  it('closes edit product modal on cancel', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))
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
    vi.mocked(fetchMyCatalog).mockRejectedValue(new Error('Error de red'))
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

  it('creates a new product through ItemFormDialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar producto/i }))

    await screen.findByRole('dialog', { name: 'Nuevo producto' })
    const nameInput = await screen.findByPlaceholderText(/nombre del producto/i)
    await user.type(nameInput, 'Collar nuevo')
    await user.type(screen.getByPlaceholderText('Ej. 350'), '199.5')
    await user.type(screen.getByPlaceholderText('Ej. 10'), '3')

    const imgButton = screen.getByRole('button', { name: /agregar imagen/i })
    await user.click(imgButton)
    const galleryInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(galleryInput, file)
    await waitFor(() => expect(uploadItemImage).toHaveBeenCalledWith(file))

    await user.click(screen.getByRole('button', { name: /^agregar$/i }))

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId: 'cat1',
        name: 'Collar nuevo',
        price: 19950,
        stock: 3,
      }),
    )
    expect(screen.queryByRole('dialog', { name: 'Nuevo producto' })).not.toBeInTheDocument()
  })

  it('rejects negative price with a Spanish validation error', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))
    const priceInput = screen.getByDisplayValue('350')
    await user.clear(priceInput)
    await user.type(priceInput, '-5')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/precio debe ser/i)
    expect(updateItem).not.toHaveBeenCalled()
  })

  it('updates a product through ItemFormDialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))
    const nameInput = screen.getByDisplayValue('Bolsa tejida')
    await user.clear(nameInput)
    await user.type(nameInput, 'Bolsa renovada')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(updateItem).toHaveBeenCalledWith('item1', expect.objectContaining({ name: 'Bolsa renovada' }))
  })

  it('deletes a product after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /eliminar bolsa tejida/i }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/¿eliminar producto\?/i)

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }))

    expect(deleteItem).toHaveBeenCalledWith('item1')
    expect(screen.queryByRole('button', { name: 'Bolsa tejida' })).not.toBeInTheDocument()
  })

  it('cancels delete without calling the action', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /eliminar bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(deleteItem).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders blank product (image only) cleanly with a fallback name', async () => {
    const blankItem: Item = {
      _id: 'blank1',
      catalogId: 'cat1',
      name: '',
      description: '',
      price: 0,
      stock: 1,
      imgPath: 'https://example.com/blank.jpg',
      sizes: [],
      updatedOn: '2024-01-01T00:00:00Z',
    }
    vi.mocked(fetchCatalogItems).mockResolvedValue([blankItem])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Producto sin nombre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eliminar producto/i })).toBeInTheDocument()
  })

  it('shows an empty-state CTA when the catalog has no products', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/aún no tienes productos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar primer producto/i })).toBeInTheDocument()
  })

  it('opens the announce composer when Anunciar is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /anunciar/i }))

    expect(screen.getByRole('dialog', { name: /anunciar a suscriptores/i })).toBeInTheDocument()
  })

  it('disables sending until a non-empty message is typed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /anunciar/i }))
    const send = screen.getByRole('button', { name: /enviar anuncio/i })
    expect(send).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/nuevos productos/i), 'Hola suscriptores')
    expect(send).toBeEnabled()
  })

  it('sends a broadcast and puts the button on cooldown', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /anunciar/i }))
    await user.type(screen.getByPlaceholderText(/nuevos productos/i), 'Nuevos rebozos')
    await user.click(screen.getByRole('button', { name: /enviar anuncio/i }))

    expect(broadcastCatalog).toHaveBeenCalledWith('cat1', 'Nuevos rebozos', null)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /anunciar a suscriptores/i })).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/próximo anuncio disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anunciar/i })).toBeDisabled()
  })

  it('sends the selected item id with the announcement', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /anunciar/i }))
    const dialog = screen.getByRole('dialog', { name: /anunciar a suscriptores/i })
    await user.type(within(dialog).getByPlaceholderText(/nuevos productos/i), 'Mira este producto')
    await user.click(within(dialog).getByRole('button', { name: 'Bolsa tejida' }))
    await user.click(within(dialog).getByRole('button', { name: /enviar anuncio/i }))

    expect(broadcastCatalog).toHaveBeenCalledWith('cat1', 'Mira este producto', 'item1')
  })

  it('shows an inline error and cooldown when the daily allowance is used', async () => {
    vi.mocked(broadcastCatalog).mockResolvedValue({
      ok: false,
      reason: 'cooldown',
      availableAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /anunciar/i }))
    await user.type(screen.getByPlaceholderText(/nuevos productos/i), 'Otro anuncio')
    await user.click(screen.getByRole('button', { name: /enviar anuncio/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ya enviaste un anuncio hoy/i)
  })
})
