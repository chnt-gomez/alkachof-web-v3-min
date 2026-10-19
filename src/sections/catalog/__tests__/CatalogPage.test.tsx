import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CatalogPage } from '../CatalogPage'
import { ToastProvider } from '@/components/ui/toast'
import { withQueryClient } from '@/test/renderWithProviders'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { resizeImage } from '@/lib/resizeImage'

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/updateCatalog')
vi.mock('../actions/updateItem')
vi.mock('../actions/createItem')
vi.mock('../actions/deleteItem')
vi.mock('../actions/broadcastCatalog')
vi.mock('../actions/uploadCatalogImage')
vi.mock('../actions/deleteCatalogImage')
vi.mock('@/sections/publicCatalog/actions/fetchCatalogLocation')
// Only the network call is mocked. `isMissingLocationError` stays real, so the
// 409-means-"add a location" mapping is exercised rather than asserted twice.
vi.mock('../actions/setCatalogDiscoverable', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../actions/setCatalogDiscoverable')>()),
  setCatalogDiscoverable: vi.fn(),
}))
vi.mock('../actions/updateLocation')
vi.mock('../actions/createLocation')
// LocationEditDialog renders the Leaflet picker, which needs a sized DOM jsdom
// does not provide. Same stub LocationMapPicker.test.tsx uses.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => ({ flyTo: vi.fn() }),
}))
// Mocked so the optimize phase can be held open; defaults to a pass-through in
// beforeEach so every other test sees the file it picked.
vi.mock('@/lib/resizeImage', () => ({ resizeImage: vi.fn() }))
// CatalogPage renders OwnerQuestionsPanel, which fetches on mount. Left real it
// hits the network, fails, and renders a second role="alert" box that makes every
// findByRole('alert') in this file ambiguous.
vi.mock('@/sections/publicCatalog/actions/fetchCatalogQuestions')

import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'
import { fetchCatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { fetchCatalogQuestions } from '@/sections/publicCatalog/actions/fetchCatalogQuestions'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { updateCatalog } from '../actions/updateCatalog'
import { updateItem } from '../actions/updateItem'
import { createItem } from '../actions/createItem'
import { deleteItem } from '../actions/deleteItem'
import { broadcastCatalog } from '../actions/broadcastCatalog'
import { uploadCatalogImage } from '../actions/uploadCatalogImage'
import { deleteCatalogImage } from '../actions/deleteCatalogImage'
import { setCatalogDiscoverable } from '../actions/setCatalogDiscoverable'
import { updateLocation } from '../actions/updateLocation'
import { createLocation } from '../actions/createLocation'
import { ApiError } from '@/lib/api'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'

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

/** A located catalog, off the map — the state every existing seller starts in. */
const mockLocation: CatalogLocation = {
  _id: 'loc1',
  lat: 19.432608,
  lng: -99.133209,
  street_name: 'Av. Insurgentes Sur',
  city: 'Ciudad de México',
  state: 'CDMX',
  number: '300',
  additional_number: '',
  neighborhood: 'Roma Norte',
  catalogId: 'cat1',
  zoneId: null,
  is_discoverable: false,
}

const mockItems: Item[] = [
  {
    _id: 'item1',
    name: 'Bolsa tejida',
    description: 'Hecha a mano',
    price: 35000,
    imgPath: 'https://example.com/bolsa.jpg',
    outOfStock: false,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'cat1',
  },
  {
    _id: 'item2',
    name: 'Aretes de plata',
    description: '',
    price: 12000,
    imgPath: '',
    outOfStock: true,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'cat1',
  },
]

function renderPage() {
  // A fresh client per render: the catalog and its items are cached, and a
  // client shared across tests would answer one test's query from another's
  // write.
  return render(
    withQueryClient(
      <ToastProvider>
        <MemoryRouter initialEntries={['/catalog']}>
          <Routes>
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:catalogId" element={<div>Vista pública</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(resizeImage).mockImplementation(async (file) => file)
  vi.mocked(fetchMyCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])
  vi.mocked(updateCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(updateItem).mockImplementation(async (itemId, patch) => ({
    ...mockItems.find((i) => i._id === itemId)!,
    ...patch,
  }))
  vi.mocked(deleteItem).mockResolvedValue(undefined)
  vi.mocked(createItem).mockResolvedValue({
    _id: 'item_new',
    catalogId: 'cat1',
    name: 'Nuevo producto',
    description: '',
    price: 10000,
    imgPath: '',
    outOfStock: false,
    updatedOn: new Date().toISOString(),
  })
  vi.mocked(broadcastCatalog).mockResolvedValue({ ok: true })
  vi.mocked(uploadCatalogImage).mockResolvedValue(withImage('https://cdn.test/cat1_123.png'))
  vi.mocked(deleteCatalogImage).mockResolvedValue(mockCatalog)
  vi.mocked(setCatalogDiscoverable).mockImplementation(async (_id, isDiscoverable) => ({
    ...mockLocation,
    is_discoverable: isDiscoverable,
  }))
  vi.mocked(updateLocation).mockResolvedValue(mockLocation)
  vi.mocked(createLocation).mockResolvedValue(mockLocation)
})

/** The API omits `image` entirely when unset, so build the present case explicitly. */
function withImage(image: string): Catalog {
  return { ...mockCatalog, image }
}

/**
 * Drives the hidden gallery input inside ImageUploadField's picker sheet.
 * userEvent.upload refuses display:none inputs, so fire the change directly.
 */
function pickFile(container: HTMLElement, file: File) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found — is the picker sheet open?')
  fireEvent.change(input, { target: { files: [file] } })
}

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

  it('shows the out-of-stock badge on products flagged outOfStock', async () => {
    renderPage()
    // 'Aretes de plata' (item2) is flagged outOfStock in the fixture
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

  it('opens add item modal when agregar artículo is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar artículo/i }))

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

    await user.click(await screen.findByRole('button', { name: /agregar artículo/i }))

    await screen.findByRole('dialog', { name: 'Nuevo producto' })
    const nameInput = await screen.findByPlaceholderText(/nombre del producto/i)
    await user.type(nameInput, 'Collar nuevo')
    await user.type(screen.getByPlaceholderText('Ej. 350'), '199.5')

    const imgButton = screen.getByRole('button', { name: /agregar imagen/i })
    await user.click(imgButton)
    const galleryInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(galleryInput, file)
    await waitFor(() => expect(screen.getByRole('img', { name: 'Collar nuevo' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^agregar$/i }))

    // The file itself travels with the create call — there is no separate upload.
    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId: 'cat1',
        name: 'Collar nuevo',
        price: 19950,
        image: file,
        // Product is the default when the seller doesn't touch the type picker.
        type: 'product',
      }),
    )
    expect(screen.queryByRole('dialog', { name: 'Nuevo producto' })).not.toBeInTheDocument()
  })

  it('creates a service, defaulting its price to zero when left blank', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar artículo/i }))
    await user.click(screen.getByRole('radio', { name: 'Servicio' }))

    // The dialog re-frames itself around the chosen type.
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo servicio' })
    expect(within(dialog).getByText(/acordar el precio con cada cliente/i)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/nombre del servicio/i), 'Corte de cabello')

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const galleryInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement
    const file = new File(['x'], 'corte.png', { type: 'image/png' })
    await user.upload(galleryInput, file)
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Corte de cabello' })).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /^agregar$/i }))

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Corte de cabello',
        type: 'service',
        price: 0,
      }),
    )
  })

  it('recolours the save button to follow the chosen type', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar artículo/i }))
    const save = screen.getByRole('button', { name: /^agregar$/i })

    // Product is the default, so the button starts on the signature green.
    expect(save).toHaveClass('bg-primary')
    expect(save).not.toHaveClass('bg-service')

    await user.click(screen.getByRole('radio', { name: 'Servicio' }))
    expect(save).toHaveClass('bg-service')
    expect(save).not.toHaveClass('bg-primary')

    await user.click(screen.getByRole('radio', { name: 'Producto' }))
    expect(save).toHaveClass('bg-primary')
  })

  it('shows the type as read-only when editing, since it cannot be changed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))

    expect(screen.queryByRole('radio', { name: 'Servicio' })).not.toBeInTheDocument()
    expect(
      screen.getByText('El tipo no se puede cambiar después de crear el artículo.'),
    ).toBeInTheDocument()
  })

  it('does not offer the stock flag when editing a service', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([
      {
        _id: 'item3',
        name: 'Corte de cabello',
        description: 'Incluye lavado',
        price: 0,
        imgPath: '',
        outOfStock: false,
        updatedOn: '2024-01-01T00:00:00Z',
        catalogId: 'cat1',
        type: 'service',
      },
    ])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Corte de cabello' }))

    const dialog = await screen.findByRole('dialog', { name: 'Editar servicio' })
    // Services have no stock, so the flag products get is absent here.
    expect(within(dialog).queryByText('Sin existencias')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Servicio')).toBeInTheDocument()
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

    // No new file picked, so the image argument stays null and the item keeps its picture.
    expect(updateItem).toHaveBeenCalledWith(
      'item1',
      expect.objectContaining({ name: 'Bolsa renovada' }),
      null,
    )
  })

  it('toggles outOfStock through the edit dialog checkbox', async () => {
    const user = userEvent.setup()
    renderPage()

    // 'Bolsa tejida' (item1) starts in stock
    await user.click(await screen.findByRole('button', { name: 'Bolsa tejida' }))
    const checkbox = screen.getByRole('checkbox', { name: /sin existencias/i })
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(updateItem).toHaveBeenCalledWith(
      'item1',
      expect.objectContaining({ outOfStock: true }),
      null,
    )
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
      imgPath: 'https://example.com/blank.jpg',
      outOfStock: false,
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

    expect(await screen.findByText(/aún no tienes artículos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar primer artículo/i })).toBeInTheDocument()
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

describe('CatalogPage catalog image', () => {
  it('renders the placeholder when the catalog has no image', async () => {
    renderPage()
    await screen.findByText('Tienda de Prueba')

    expect(screen.getByRole('img', { name: /aún no tiene imagen/i })).toBeInTheDocument()
    expect(screen.queryByAltText('Tienda de Prueba')).not.toBeInTheDocument()
  })

  it('renders the catalog image when the api returns one', async () => {
    vi.mocked(fetchMyCatalog).mockResolvedValue(withImage('https://cdn.test/tienda.png'))
    renderPage()
    await screen.findByText('Tienda de Prueba')

    expect(await screen.findByAltText('Tienda de Prueba')).toHaveAttribute(
      'src',
      'https://cdn.test/tienda.png',
    )
    expect(screen.queryByRole('img', { name: /aún no tiene imagen/i })).not.toBeInTheDocument()
  })

  it('uploads a picked image and renders the url the api returned', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await screen.findByText('Tienda de Prueba')

    await user.click(screen.getByRole('button', { name: 'Editar catálogo' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar imagen' }))
    pickFile(container, new File(['x'], 'tienda.png', { type: 'image/png' }))

    await waitFor(() => expect(uploadCatalogImage).toHaveBeenCalledTimes(1))
    expect(vi.mocked(uploadCatalogImage).mock.calls[0][0]).toBe('cat1')

    const images = await screen.findAllByAltText('Tienda de Prueba')
    expect(images[0]).toHaveAttribute('src', 'https://cdn.test/cat1_123.png')
  })

  it('rejects an unsupported file type before calling the api', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await screen.findByText('Tienda de Prueba')

    await user.click(screen.getByRole('button', { name: 'Editar catálogo' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar imagen' }))
    // WebP is accepted now that the API re-encodes every upload, so this uses a
    // genuine non-image instead.
    pickFile(container, new File(['x'], 'tienda.pdf', { type: 'application/pdf' }))

    // Matched on the full message, not by role: the owner questions panel
    // renders its own alert, and the field's hint also mentions the formats.
    expect(await screen.findByText('Formato no admitido. Usa JPG, PNG o WebP.')).toBeInTheDocument()
    expect(uploadCatalogImage).not.toHaveBeenCalled()
  })

  // Optimising a phone photo can take seconds. In the item dialog the resized
  // file IS what the form submits, so saving mid-optimise would create the item
  // without its image.
  it('blocks saving a new item while its image is being optimized', async () => {
    const user = userEvent.setup()
    let release!: (file: File) => void
    vi.mocked(resizeImage).mockImplementation(
      () => new Promise<File>((resolve) => { release = resolve }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar artículo/i }))
    await screen.findByRole('dialog', { name: 'Nuevo producto' })
    await user.type(await screen.findByPlaceholderText(/nombre del producto/i), 'Collar nuevo')

    await user.click(screen.getByRole('button', { name: /agregar imagen/i }))
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    fireEvent.change(
      document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement,
      { target: { files: [file] } },
    )

    expect(await screen.findByText('Optimizando imagen para internet…')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /^agregar$/i })
    expect(save).toBeDisabled()

    release(file)
    await waitFor(() => expect(save).toBeEnabled())
    await user.click(save)
    await waitFor(() =>
      expect(createItem).toHaveBeenCalledWith(expect.objectContaining({ image: file })),
    )
  })

  it('blocks saving the catalog while its image is being optimized', async () => {
    const user = userEvent.setup()
    let release!: (file: File) => void
    vi.mocked(resizeImage).mockImplementation(
      () => new Promise<File>((resolve) => { release = resolve }),
    )
    const { container } = renderPage()
    await screen.findByText('Tienda de Prueba')

    await user.click(screen.getByRole('button', { name: 'Editar catálogo' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar imagen' }))
    const file = new File(['x'], 'tienda.png', { type: 'image/png' })
    pickFile(container, file)

    expect(await screen.findByText('Optimizando imagen para internet…')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeDisabled()

    release(file)
    await waitFor(() => expect(save).toBeEnabled())
  })

  it('removes the image and returns the header to the placeholder', async () => {
    vi.mocked(fetchMyCatalog).mockResolvedValue(withImage('https://cdn.test/tienda.png'))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Tienda de Prueba')

    await user.click(screen.getByRole('button', { name: 'Editar catálogo' }))
    await user.click(await screen.findByRole('button', { name: /quitar imagen/i }))

    await waitFor(() => expect(deleteCatalogImage).toHaveBeenCalledWith('cat1'))
    expect(await screen.findByRole('img', { name: /aún no tiene imagen/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /quitar imagen/i })).not.toBeInTheDocument()
  })
  // Opt-in map discoverability. Contract:
  // `docs.OptInMapDiscoverable.frontend.md`.
  describe('map discoverability', () => {
    const TOGGLE = 'Permitir que me encuentren en el mapa'
    const NEEDS_PIN = 'Agrega una ubicación con un punto en el mapa para poder aparecer.'

    // LocationMapPicker's "use my location" button is the only way to place a
    // pin with Leaflet stubbed, and the address dialog will not save without
    // one. Same stub LocationMapPicker.test.tsx uses.
    beforeEach(() => {
      Object.defineProperty(globalThis.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) =>
            success({ coords: { latitude: 19.432608, longitude: -99.133209 } } as GeolocationPosition),
        },
      })
    })

    async function openEditor(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByText('Tienda de Prueba')
      await user.click(screen.getByRole('button', { name: 'Editar catálogo' }))
      return screen.findByRole('checkbox', { name: TOGGLE })
    }

    it('renders the toggle off and writable for a located catalog', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)

      expect(toggle).not.toBeChecked()
      expect(toggle).toBeEnabled()
      expect(
        screen.getByText(
          'Tu catálogo no aparece en el mapa. Tu enlace y tu código QR siguen funcionando igual.',
        ),
      ).toBeInTheDocument()
    })

    it('renders the toggle on when the catalog opted in', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue({ ...mockLocation, is_discoverable: true })
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)

      expect(toggle).toBeChecked()
      expect(screen.queryByText(/no aparece en el mapa/i)).not.toBeInTheDocument()
    })

    // Rendered, not hidden: a hidden control teaches nobody that the map exists.
    it('renders the toggle disabled with a reason when the catalog has no location', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)

      expect(toggle).toBeDisabled()
      expect(screen.getByText(NEEDS_PIN)).toBeInTheDocument()
    })

    it('renders the toggle disabled when the stored coordinates are out of range', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue({ ...mockLocation, lat: 999 })
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)

      expect(toggle).toBeDisabled()
      expect(screen.getByText(NEEDS_PIN)).toBeInTheDocument()
    })

    // The API allows the exit from any state, and so must the UI: a seller whose
    // coordinates are unusable is exactly one who wants off the map.
    it('lets a catalog with unusable coordinates still opt out', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue({
        ...mockLocation,
        lat: 999,
        is_discoverable: true,
      })
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)
      expect(toggle).toBeEnabled()

      await user.click(toggle)
      expect(setCatalogDiscoverable).toHaveBeenCalledWith('loc1', false)
    })

    it('flips the toggle before the request resolves and sends the opt-in', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
      let release!: (location: CatalogLocation) => void
      vi.mocked(setCatalogDiscoverable).mockReturnValue(
        new Promise<CatalogLocation>((resolve) => {
          release = resolve
        }),
      )
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)
      await user.click(toggle)

      expect(setCatalogDiscoverable).toHaveBeenCalledWith('loc1', true)
      expect(toggle).toBeChecked()
      expect(screen.getByText('Guardando…')).toBeInTheDocument()

      release({ ...mockLocation, is_discoverable: true })
      await waitFor(() => expect(screen.queryByText('Guardando…')).not.toBeInTheDocument())
      expect(toggle).toBeChecked()
    })

    // A 409 is the one refusal a seller can cause. Its Spanish copy is ours and
    // is keyed off the status — the API's own message is English.
    it('rolls back and explains when the API refuses for want of a pin', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
      vi.mocked(setCatalogDiscoverable).mockRejectedValue(
        new ApiError('A location with valid coordinates is required', 409, {
          message: 'A location with valid coordinates is required',
        }),
      )
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)
      await user.click(toggle)

      expect(
        await screen.findByText('Agrega una ubicación en el mapa antes de aparecer.'),
      ).toBeInTheDocument()
      // The English the API sent must not reach the seller.
      expect(screen.queryByText(/valid coordinates/i)).not.toBeInTheDocument()
      expect(toggle).not.toBeChecked()
    })

    it('rolls back with a generic message on any other failure', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
      vi.mocked(setCatalogDiscoverable).mockRejectedValue(new Error('Error de red'))
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)
      await user.click(toggle)

      expect(
        await screen.findByText('No se pudo cambiar tu visibilidad en el mapa.'),
      ).toBeInTheDocument()
      expect(toggle).not.toBeChecked()
    })

    // This client's half of the no-clobber bargain. The API ignores the key on
    // /update, but a body that carries it is still a bug worth catching here:
    // it would mean the flag had leaked back onto the address form's type.
    it('does not send is_discoverable when the address form is saved', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue({ ...mockLocation, is_discoverable: true })
      const user = userEvent.setup()
      renderPage()

      await openEditor(user)
      await user.click(screen.getByRole('button', { name: /editar ubicación/i }))
      await user.click(await screen.findByRole('button', { name: 'Guardar ubicación' }))

      await waitFor(() => expect(updateLocation).toHaveBeenCalled())
      const [locationId, body] = vi.mocked(updateLocation).mock.calls[0]
      expect(locationId).toBe('loc1')
      expect(body).not.toHaveProperty('is_discoverable')
    })

    // A location is created with the flag off, so the seller who has just become
    // placeable gets the invitation rather than silence.
    it('invites the opt-in once a save makes the catalog placeable', async () => {
      // Starts with an unusable pin, which is the state the toggle is disabled
      // in — then the address form fixes it.
      vi.mocked(fetchCatalogLocation).mockResolvedValue({ ...mockLocation, lat: 999 })
      const user = userEvent.setup()
      renderPage()

      const toggle = await openEditor(user)
      expect(toggle).toBeDisabled()
      expect(
        screen.queryByText('Ya tienes ubicación. ¿Quieres que te encuentren en el mapa?'),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /editar ubicación/i }))
      // The dialog refuses to save without a usable pin, so this has to place
      // one — which is the real flow a seller in this state goes through.
      await user.click(await screen.findByRole('button', { name: /usar mi ubicación actual/i }))
      await user.click(await screen.findByRole('button', { name: 'Guardar ubicación' }))

      expect(
        await screen.findByText('Ya tienes ubicación. ¿Quieres que te encuentren en el mapa?'),
      ).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: TOGGLE })).toBeEnabled()
    })

    // The other half of that rule: a seller who is deliberately off the map and
    // editing their street must not be nagged about the map every time.
    it('does not invite the opt-in when an already-placed catalog edits its address', async () => {
      vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
      const user = userEvent.setup()
      renderPage()

      await openEditor(user)
      await user.click(screen.getByRole('button', { name: /editar ubicación/i }))
      await user.click(await screen.findByRole('button', { name: 'Guardar ubicación' }))

      await waitFor(() => expect(updateLocation).toHaveBeenCalled())
      expect(
        screen.queryByText('Ya tienes ubicación. ¿Quieres que te encuentren en el mapa?'),
      ).not.toBeInTheDocument()
    })
  })
})
