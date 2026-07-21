import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicCatalogPage } from '../PublicCatalogPage'
import type { Catalog } from '../actions/fetchPublicCatalog'
import type { Item } from '../actions/fetchCatalogItems'
import { ApiError } from '@/lib/api'

vi.mock('../actions/fetchPublicCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/fetchCatalogQuestions')
vi.mock('../actions/askQuestion')
vi.mock('../actions/answerQuestion')
vi.mock('@/sections/cart/actions/checkoutCart')

// Toggleable auth state so most tests run as a visitor while the checkout
// flow can flip to an authenticated user.
const authState = vi.hoisted(() => ({ isAuthenticated: false }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated ? { alias: 'Ana' } : null,
    isAuthenticated: authState.isAuthenticated,
    isBooting: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

import { fetchPublicCatalog } from '../actions/fetchPublicCatalog'
import { fetchCatalogItems } from '../actions/fetchCatalogItems'
import { fetchCatalogQuestions } from '../actions/fetchCatalogQuestions'
import { checkoutCart } from '@/sections/cart/actions/checkoutCart'
import { ToastProvider } from '@/components/ui/toast'
import { CartProvider } from '@/sections/cart/context/CartContext'

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
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/public/catalog/:catalogId" element={<PublicCatalogPage />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  authState.isAuthenticated = false
  vi.mocked(fetchPublicCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])
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

  it('renders the FAQ section with empty state when no questions exist', async () => {
    renderPage()

    expect(await screen.findByText('Preguntas frecuentes')).toBeInTheDocument()
    expect(await screen.findByText('Aún no hay preguntas.')).toBeInTheDocument()
  })

  it('prompts anonymous users to log in before asking a question', async () => {
    renderPage()

    expect(await screen.findByText(/inicia sesión para hacer una pregunta/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar pregunta/i })).not.toBeInTheDocument()
  })

  it('renders existing questions with their answers', async () => {
    vi.mocked(fetchCatalogQuestions).mockResolvedValue([
      {
        id: 'q1',
        questionText: '¿Hacen envíos?',
        questionAnswer: 'Sí, a todo el país.',
        userId: 'user9',
        catalogId: 'abc123',
        flag: null,
        createdOn: '2026-06-01T00:00:00Z',
        updatedOn: '2026-06-01T00:00:00Z',
      },
    ])
    renderPage()

    expect(await screen.findByText('¿Hacen envíos?')).toBeInTheDocument()
    expect(screen.getByText('Sí, a todo el país.')).toBeInTheDocument()
  })

  it('hides questions flagged as inappropriate from non-owners', async () => {
    vi.mocked(fetchCatalogQuestions).mockResolvedValue([
      {
        id: 'q1',
        questionText: 'Ok question',
        questionAnswer: null,
        userId: 'user9',
        catalogId: 'abc123',
        flag: null,
        createdOn: '2026-06-01T00:00:00Z',
        updatedOn: '2026-06-01T00:00:00Z',
      },
      {
        id: 'q2',
        questionText: 'Bad question',
        questionAnswer: null,
        userId: 'user9',
        catalogId: 'abc123',
        flag: 'inappropriate',
        createdOn: '2026-06-01T00:00:00Z',
        updatedOn: '2026-06-01T00:00:00Z',
      },
    ])
    renderPage()

    expect(await screen.findByText('Ok question')).toBeInTheDocument()
    expect(screen.queryByText('Bad question')).not.toBeInTheDocument()
  })

  it('renders product images with object-contain to preserve aspect ratio', async () => {
    renderPage()

    const img = await screen.findByRole('img', { name: /bolsa tejida/i })
    expect(img).toHaveClass('object-contain')
    expect(img.className).not.toMatch(/object-cover/)
  })

  it('shows the cart book-tag on landing with no count badge', async () => {
    renderPage()

    const tag = await screen.findByRole('button', { name: /ver carrito/i })
    expect(tag).toBeInTheDocument()
    // badge is hidden while the cart is empty — the tag holds only the icon
    expect(tag.textContent).toBe('')
  })

  it('updates the book-tag badge after adding an item to the cart', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    const tag = await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i })
    expect(tag).toHaveTextContent('1')
  })

  it('opens the cart drawer when the book-tag is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /ver carrito/i }))

    expect(screen.getByText('Tu carrito')).toBeInTheDocument()
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('shows an added item and its subtotal in the drawer without a backend call', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    await user.click(await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }))

    // drawer lists the line item and the subtotal derived client-side
    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    // the item name now appears both on the catalog card and in the drawer line
    expect(screen.getAllByText('Bolsa tejida').length).toBeGreaterThan(1)
    // the line snapshots its own price, so the drawer shows the real amount
    // (card + drawer line + subtotal) rather than $0.00
    expect(screen.getAllByText('$350.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar pedido|inicia sesión/i })).toBeInTheDocument()
  })

  it('keeps a separate, persisted cart per catalog', async () => {
    const user = userEvent.setup()

    // Each catalog serves its own items so addItem keys by the right catalog.
    const itemsA: Item[] = [{ ...mockItems[0], _id: 'a1', name: 'Producto A', catalogId: 'cat-a' }]
    const itemsB: Item[] = [{ ...mockItems[0], _id: 'b1', name: 'Producto B', catalogId: 'cat-b' }]
    vi.mocked(fetchCatalogItems).mockImplementation((id: string) =>
      Promise.resolve(id === 'cat-b' ? itemsB : itemsA),
    )

    // Catalog A: add an item → badge shows 1
    const viewA = renderPage('cat-a')
    await user.click(await screen.findByRole('button', { name: /producto a/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(
      await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }),
    ).toBeInTheDocument()
    viewA.unmount()

    // Catalog B: starts empty — A's item does not leak across
    const viewB = renderPage('cat-b')
    const tagB = await screen.findByRole('button', { name: /ver carrito/i })
    expect(tagB.textContent).toBe('')
    await user.click(await screen.findByRole('button', { name: /producto b/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(
      await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }),
    ).toBeInTheDocument()
    viewB.unmount()

    // Returning to catalog A: its cart is still there
    renderPage('cat-a')
    expect(
      await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }),
    ).toBeInTheDocument()
  })

  it('shows a loading indicator then a confirmation with the correct total on checkout', async () => {
    const user = userEvent.setup()
    authState.isAuthenticated = true
    vi.mocked(checkoutCart).mockResolvedValue({
      purchases: ['p1'],
      transaction: {
        id: 'txn-123',
        purchaseIds: ['p1'],
        buyerId: 'buyer1',
        sellerId: 'seller1',
        status: 'STARTED',
        dateCreated: '2026-07-21T00:00:00Z',
        dateUpdated: '2026-07-21T00:00:00Z',
      },
    })

    renderPage()

    // add an item and open the drawer
    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    await user.click(await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }))

    // finalize the purchase → the button turns into a progress bar
    fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }))
    expect(screen.getByRole('progressbar', { name: /procesando pedido/i })).toBeInTheDocument()
    expect(screen.getByText('Procesando…')).toBeInTheDocument()

    // then the confirmation shows with the real total (not $0.00)
    expect(await screen.findByText('¡Pedido enviado!', {}, { timeout: 2500 })).toBeInTheDocument()
    expect(screen.getByText('txn-123')).toBeInTheDocument()
    // summary line + Total both read the snapshotted price
    expect(screen.getAllByText('$350.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
  })
})
