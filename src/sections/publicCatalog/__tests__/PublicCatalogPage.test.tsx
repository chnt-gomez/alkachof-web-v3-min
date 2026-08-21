import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicCatalogPage } from '../PublicCatalogPage'
import type { Catalog } from '../actions/fetchPublicCatalog'
import type { Item } from '../actions/fetchCatalogItems'
import { ApiError } from '@/lib/api'
import { MIN_PENDING_MS } from '@/lib/pendingAction'

vi.mock('../actions/fetchPublicCatalog')
vi.mock('../actions/fetchCatalogItems')
// The jumbotron reads the location to decide whether to show the map pin.
vi.mock('../actions/fetchCatalogLocation')
vi.mock('../actions/fetchCatalogQuestions')
vi.mock('../actions/askQuestion')
vi.mock('../actions/answerQuestion')
vi.mock('../actions/fetchUserSubscriptions')
vi.mock('../actions/subscribe')
vi.mock('../actions/unsubscribe')
// Stub only the network call; ServiceInCartError must stay the real class
// because CartDrawer branches on `instanceof`.
vi.mock('@/sections/cart/actions/checkoutCart', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sections/cart/actions/checkoutCart')>()),
  checkoutCart: vi.fn(),
}))

// The jumbotron reads useChat only to reuse/open a seller conversation from the
// "Contactar" button; the page tests don't exercise chat, so stub it.
vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ findChatWith: () => undefined }),
}))

// Booking a service posts to /request/create.
vi.mock('@/sections/requests/actions/createRequest')

// Toggleable auth state so most tests run as a visitor while the checkout
// flow can flip to an authenticated user. `userId` decides ownership: the
// fixture catalog belongs to 'user1', so the default 'user2' is a buyer.
const authState = vi.hoisted(() => ({ isAuthenticated: false, userId: 'user2' }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated ? { alias: 'Ana', userId: authState.userId } : null,
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
import { fetchCatalogLocation } from '../actions/fetchCatalogLocation'
import { fetchCatalogQuestions } from '../actions/fetchCatalogQuestions'
import { askQuestion } from '../actions/askQuestion'
import { fetchUserSubscriptions } from '../actions/fetchUserSubscriptions'
import { subscribe } from '../actions/subscribe'
import { unsubscribe } from '../actions/unsubscribe'
import { checkoutCart, ServiceInCartError } from '@/sections/cart/actions/checkoutCart'
import { createRequest } from '@/sections/requests/actions/createRequest'
import { ToastProvider } from '@/components/ui/toast'
import { CartProvider } from '@/sections/cart/context/CartContext'

// Non-idempotent actions are held for MIN_PENDING_MS while the button fills, so
// assertions on the result have to outwait it (the default findBy timeout is
// 1000ms — exactly the floor, too close to be reliable).
const HELD_MS = MIN_PENDING_MS + 1500

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
    imgPath: 'https://example.com/bolsa.jpg',
    outOfStock: false,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'abc123',
  },
  {
    _id: 'item2',
    name: 'Aretes de plata',
    description: '',
    price: 12000,
    imgPath: '',
    outOfStock: true,
    updatedOn: '2024-01-01T00:00:00Z',
    catalogId: 'abc123',
  },
]

// A service: no stock, and no price until the seller quotes it.
const mockService: Item = {
  _id: 'item3',
  name: 'Corte de cabello',
  description: 'Incluye lavado',
  price: 0,
  imgPath: '',
  outOfStock: false,
  updatedOn: '2024-01-01T00:00:00Z',
  catalogId: 'abc123',
  type: 'service',
}

function renderPage(catalogId = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/public/catalog/${catalogId}`]}>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/public/catalog/:catalogId" element={<PublicCatalogPage />} />
            <Route path="/chats/new" element={<div>Nueva conversación</div>} />
            <Route path="/transactions" element={<div>Mis solicitudes</div>} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  authState.isAuthenticated = false
  authState.userId = 'user2'
  vi.mocked(fetchPublicCatalog).mockResolvedValue(mockCatalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(mockItems)
  vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])
  vi.mocked(fetchUserSubscriptions).mockResolvedValue([])
  vi.mocked(createRequest).mockResolvedValue({
    id: 'req1',
    serviceId: 'item3',
    buyerId: 'user2',
    sellerId: 'user1',
    catalogId: 'abc123',
    status: 'REQUESTED',
    finalPrice: null,
    customerNote: '',
    dateCreated: '2026-08-19T10:00:00Z',
    dateUpdated: null,
  })
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

  it('renders catalog description', async () => {
    renderPage()

    expect(await screen.findByText('Productos hechos a mano en Oaxaca')).toBeInTheDocument()
  })

  it('opens the shipping-info modal from the help button in the Envío section', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /información sobre opciones de envío/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Opciones de envío' })
    expect(dialog).toBeInTheDocument()
    // all three buyer-facing options + the Alkachof disclaimer
    expect(screen.getByText(/estará feliz de recibirte/i)).toBeInTheDocument()
    expect(screen.getByText(/entregas informales por sus propios medios/i)).toBeInTheDocument()
    expect(screen.getByText(/servicio de paquetería privado/i)).toBeInTheDocument()
    expect(screen.getByText(/Alkachof no gestiona ningún tipo de entrega o envío/i)).toBeInTheDocument()
  })

  it('renders all catalog items', async () => {
    renderPage()

    expect(await screen.findByText('Bolsa tejida')).toBeInTheDocument()
    expect(screen.getByText('Aretes de plata')).toBeInTheDocument()
  })

  it('shows the out-of-stock badge on cards flagged outOfStock', async () => {
    renderPage()

    // 'Aretes de plata' (item2) is flagged outOfStock in the fixture
    expect(await screen.findByText('Sin existencias')).toBeInTheDocument()
  })

  it('disables add-to-cart in the detail dialog for an out-of-stock item', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /aretes de plata/i }))

    expect(screen.queryByRole('button', { name: /agregar al carrito/i })).not.toBeInTheDocument()
    // exact match targets the dialog's disabled button, not the card whose
    // accessible name also contains the badge text
    expect(screen.getByRole('button', { name: 'Sin existencias' })).toBeDisabled()
  })

  it('renders empty state when catalog has no items', async () => {
    vi.mocked(fetchCatalogItems).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Sin artículos aún.')).toBeInTheDocument()
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

  it('hides the subscribe button from guests', async () => {
    renderPage()

    // wait for the jumbotron to render, then assert the button is absent
    expect(await screen.findByText('Mi Tienda Artesanal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suscribirme/i })).not.toBeInTheDocument()
  })

  it('shows the subscribe button to authenticated users', async () => {
    authState.isAuthenticated = true
    renderPage()

    expect(await screen.findByRole('button', { name: /suscribirme/i })).toBeInTheDocument()
  })

  it('subscribes via the API when the button is clicked', async () => {
    authState.isAuthenticated = true
    vi.mocked(subscribe).mockResolvedValue({ _id: 'sub1', userId: 'user2', catalogId: 'abc123' })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /suscribirme/i }))

    expect(subscribe).toHaveBeenCalledWith('abc123')
    // Button flips to the subscribed state.
    expect(await screen.findByRole('button', { name: /suscrito/i })).toBeInTheDocument()
  })

  it('renders the subscribed state when the user already follows the catalog', async () => {
    authState.isAuthenticated = true
    vi.mocked(fetchUserSubscriptions).mockResolvedValue([
      { _id: 'sub1', userId: 'user2', catalogId: 'abc123' },
    ])
    renderPage()

    expect(await screen.findByRole('button', { name: /suscrito/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suscribirme/i })).not.toBeInTheDocument()
  })

  it('unsubscribes via the API when an already-subscribed user clicks the button', async () => {
    authState.isAuthenticated = true
    vi.mocked(fetchUserSubscriptions).mockResolvedValue([
      { _id: 'sub1', userId: 'user2', catalogId: 'abc123' },
    ])
    vi.mocked(unsubscribe).mockResolvedValue()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /suscrito/i }))

    expect(unsubscribe).toHaveBeenCalledWith('abc123')
    expect(await screen.findByRole('button', { name: /suscribirme/i })).toBeInTheDocument()
  })

  it('keeps the unsubscribed state when the subscribe call fails', async () => {
    authState.isAuthenticated = true
    vi.mocked(subscribe).mockRejectedValue(new Error('Boom'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /suscribirme/i }))

    expect(subscribe).toHaveBeenCalledWith('abc123')
    // Failure leaves the button in its original state, ready to retry.
    expect(await screen.findByRole('button', { name: /suscribirme/i })).toBeInTheDocument()
  })

  it('opens product detail dialog when an item card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const card = await screen.findByRole('button', { name: /bolsa tejida/i })
    await user.click(card)

    // card thumbnail + dialog image both render; description is dialog-only
    expect(screen.getAllByRole('img', { name: /bolsa tejida/i })).toHaveLength(2)
    expect(screen.getByText('Hecha a mano con lana natural')).toBeInTheDocument()
    expect(screen.getAllByText('$350.00')).toHaveLength(2) // card + dialog
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

  it('prompts a guest to sign up on checkout instead of sending the order', async () => {
    const user = userEvent.setup()
    // authState.isAuthenticated stays false (guest) from beforeEach

    renderPage()

    await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    await user.click(await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }))

    await user.click(screen.getByRole('button', { name: /finalizar pedido/i }))

    // the signup-encouragement dialog appears and no checkout call is made
    expect(await screen.findByText('Crea una cuenta para comprar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(checkoutCart).not.toHaveBeenCalled()
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

  it('explains and repairs the cart when checkout refuses a service line', async () => {
    const user = userEvent.setup()
    authState.isAuthenticated = true
    // A service that reached the cart before the client tracked item types:
    // no `type`, so only the server can identify it.
    localStorage.setItem(
      'alkachof.cart',
      JSON.stringify({
        abc123: [
          { itemId: 'item1', quantity: 1, name: 'Bolsa tejida', price: 35000, imgPath: '' },
          { itemId: 'legacy-svc', quantity: 1, name: 'Corte de cabello', price: 0, imgPath: '' },
        ],
      }),
    )
    vi.mocked(checkoutCart).mockRejectedValue(
      new ServiceInCartError(
        'Service items cannot be purchased through checkout',
        'legacy-svc',
      ),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: /ver carrito \(2 artículos\)/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }))

    // The offending line is named, and the user is told nothing was charged.
    const alert = await screen.findByRole('alert', {}, { timeout: 2500 })
    expect(alert).toHaveTextContent('Quitamos «Corte de cabello» de tu carrito')
    expect(alert).toHaveTextContent(/no se hizo ningún cargo/i)

    // The service is gone from the cart, the product survived, and checkout can
    // be retried. (The product also appears on the catalog card behind the
    // drawer, hence the count rather than a single match.)
    expect(screen.queryByText('Corte de cabello')).not.toBeInTheDocument()
    expect(screen.getAllByText('Bolsa tejida').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /ver carrito \(1 artículo\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar pedido/i })).toBeInTheDocument()
  })

  describe('service items', () => {
    beforeEach(() => {
      vi.mocked(fetchCatalogItems).mockResolvedValue([...mockItems, mockService])
    })

    it('marks a service card and shows that its price is not set', async () => {
      renderPage()

      expect(await screen.findByText('Corte de cabello')).toBeInTheDocument()
      expect(screen.getByText('Servicio')).toBeInTheDocument()
      expect(screen.getByText('Precio a convenir')).toBeInTheDocument()
      expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
    })

    it('tags every card with its type, so neither kind is the unlabelled default', async () => {
      renderPage()

      await screen.findByText('Corte de cabello')
      // One service among the mock products, each carrying its own tag.
      expect(screen.getAllByText('Producto')).toHaveLength(mockItems.length)
      expect(screen.getAllByText('Servicio')).toHaveLength(1)
    })

    it('shows a real amount when the seller priced the service', async () => {
      vi.mocked(fetchCatalogItems).mockResolvedValue([{ ...mockService, price: 1999 }])
      renderPage()

      expect(await screen.findByText('$19.99')).toBeInTheDocument()
      expect(screen.queryByText('Precio a convenir')).not.toBeInTheDocument()
    })

    it('offers Solicitar instead of the cart, with no quantity picker', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))

      expect(screen.getByRole('button', { name: 'Solicitar' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /agregar al carrito/i })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Aumentar cantidad')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Disminuir cantidad')).not.toBeInTheDocument()
      expect(
        screen.getByText('El precio se acuerda directamente con el vendedor.'),
      ).toBeInTheDocument()
    })

    it('still offers the cart and a quantity picker for a product', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))

      expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Aumentar cantidad')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Solicitar' })).not.toBeInTheDocument()
    })

    it('asks a guest to sign up before requesting a service', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))

      expect(await screen.findByText('Crea una cuenta para solicitar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
      // Auth is checked before the note form, so nobody writes one for nothing.
      expect(screen.queryByRole('dialog', { name: 'Solicitar servicio' })).not.toBeInTheDocument()
    })

    it('collects a note, then books the service with it', async () => {
      authState.isAuthenticated = true
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))

      // The note form appears rather than firing the request straight off.
      const form = await screen.findByRole('dialog', { name: 'Solicitar servicio' })
      expect(within(form).getByLabelText(/detalles para el vendedor/i)).toBeInTheDocument()
      // A price-less service says outright that the note drives the quote.
      expect(
        within(form).getByText('El vendedor usará estos datos para darte un precio.'),
      ).toBeInTheDocument()

      await user.type(
        screen.getByLabelText(/detalles para el vendedor/i),
        'Para el sábado, cabello largo.',
      )
      await user.click(screen.getByRole('button', { name: /enviar solicitud/i }))

      expect(createRequest).toHaveBeenCalledWith('item3', 'Para el sábado, cabello largo.')
      // The buyer lands where the seller's quote will show up — after the
      // standard hold, so the assertion has to outwait it.
      expect(await screen.findByText('Mis solicitudes', {}, { timeout: HELD_MS })).toBeInTheDocument()
    })

    it('holds the send button as a progress bar while the booking is in flight', async () => {
      authState.isAuthenticated = true
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))

      // fireEvent, not userEvent: the latter awaits pending timers, which would
      // sit through the whole hold and miss the state being asserted.
      fireEvent.click(await screen.findByRole('button', { name: /enviar solicitud/i }))

      expect(screen.getByRole('progressbar', { name: /enviando la solicitud/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    })

    it('books without a note when the buyer writes none', async () => {
      authState.isAuthenticated = true
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))
      await user.click(await screen.findByRole('button', { name: /enviar solicitud/i }))

      expect(createRequest).toHaveBeenCalledWith('item3', '')
    })

    it('surfaces a booking failure without closing the buyer out', async () => {
      authState.isAuthenticated = true
      vi.mocked(createRequest).mockRejectedValueOnce(
        new ApiError('You cannot request your own service', 400),
      )
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))
      await user.click(await screen.findByRole('button', { name: /enviar solicitud/i }))

      expect(
        await screen.findByText('Este servicio es tuyo, no puedes solicitarlo.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Mis solicitudes')).not.toBeInTheDocument()
    })

    it('backs out of the note form without sending', async () => {
      authState.isAuthenticated = true
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      await user.click(screen.getByRole('button', { name: 'Solicitar' }))
      await user.click(await screen.findByRole('button', { name: /cancelar/i }))

      expect(screen.queryByRole('dialog', { name: 'Solicitar servicio' })).not.toBeInTheDocument()
      expect(screen.queryByText('Nueva conversación')).not.toBeInTheDocument()
      // Still on the product dialog, so they can try again.
      expect(screen.getByRole('button', { name: 'Solicitar' })).toBeInTheDocument()
    })

  })

  // The owner may browse their own shop, but every buyer-side action is
  // meaningless against themselves. The controls stay visible and explain
  // why they don't work, rather than silently doing nothing.
  describe('when the owner views their own catalog', () => {
    beforeEach(() => {
      authState.isAuthenticated = true
      authState.userId = 'user1' // mockCatalog.userId
      vi.mocked(fetchCatalogItems).mockResolvedValue([...mockItems, mockService])
    })

    it('blocks adding a product to the cart and says why', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
      const addButton = screen.getByRole('button', { name: /agregar al carrito/i })
      expect(addButton).toHaveAttribute('aria-disabled', 'true')

      await user.click(addButton)

      expect(
        await screen.findByText('Este es tu catálogo: no puedes comprar tus propios productos.'),
      ).toBeInTheDocument()
      // The dialog stays open and nothing lands in the cart.
      expect(screen.getByRole('button', { name: /ver carrito \(0 artículos\)/i })).toBeInTheDocument()
    })

    it('blocks requesting their own service and says why', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /corte de cabello/i }))
      const requestButton = screen.getByRole('button', { name: 'Solicitar' })
      expect(requestButton).toHaveAttribute('aria-disabled', 'true')

      await user.click(requestButton)

      expect(
        await screen.findByText('Este es tu catálogo: no puedes solicitar tus propios servicios.'),
      ).toBeInTheDocument()
      // No conversation was opened.
      expect(screen.queryByText('Nueva conversación')).not.toBeInTheDocument()
    })

    it('blocks asking a question on their own catalog and says why', async () => {
      const user = userEvent.setup()
      renderPage()

      const askButton = await screen.findByRole('button', { name: /enviar pregunta/i })
      expect(askButton).toHaveAttribute('aria-disabled', 'true')

      await user.click(askButton)

      expect(
        await screen.findByText('Este es tu catálogo: no puedes hacerte preguntas a ti mismo.'),
      ).toBeInTheDocument()
      expect(askQuestion).not.toHaveBeenCalled()
    })

    it('still lets a non-owner buy, request and ask', async () => {
      authState.userId = 'user2'
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /bolsa tejida/i }))
      const addButton = screen.getByRole('button', { name: /agregar al carrito/i })
      expect(addButton).not.toHaveAttribute('aria-disabled')

      await user.click(addButton)

      expect(
        await screen.findByRole('button', { name: /ver carrito \(1 artículo\)/i }),
      ).toBeInTheDocument()
    })
  })
})

describe('PublicCatalogPage catalog image', () => {
  it('renders the catalog image when the api returns one', async () => {
    vi.mocked(fetchPublicCatalog).mockResolvedValue({
      ...mockCatalog,
      image: 'https://cdn.test/tienda.png',
    })
    renderPage()

    expect(await screen.findByAltText('Mi Tienda Artesanal')).toHaveAttribute(
      'src',
      'https://cdn.test/tienda.png',
    )
  })

  it('renders the placeholder when the catalog has no image', async () => {
    renderPage()
    await screen.findByText('Mi Tienda Artesanal')

    expect(screen.getByRole('img', { name: /aún no tiene imagen/i })).toBeInTheDocument()
  })

  it('never shows the owner upload or remove affordances to a visitor', async () => {
    vi.mocked(fetchPublicCatalog).mockResolvedValue({
      ...mockCatalog,
      image: 'https://cdn.test/tienda.png',
    })
    renderPage()
    await screen.findByAltText('Mi Tienda Artesanal')

    expect(screen.queryByRole('button', { name: /quitar imagen/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar imagen' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cambiar imagen' })).not.toBeInTheDocument()
  })
})

describe('PublicCatalogPage location', () => {
  const mockLocation = {
    _id: 'loc1',
    lat: 17.0654,
    lng: -96.7237,
    street_name: 'Calle Macedonio Alcalá',
    number: '203',
    additional_number: '',
    neighborhood: 'Centro',
    city: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    catalogId: 'abc123',
    zoneId: null,
  }

  it('hides the map pin when the catalog has no location', async () => {
    renderPage()
    await screen.findByText('Mi Tienda Artesanal')

    expect(screen.queryByRole('button', { name: /ubicación en el mapa/i })).not.toBeInTheDocument()
  })

  it('hides the map pin when the stored coordinates are out of range', async () => {
    vi.mocked(fetchCatalogLocation).mockResolvedValue({ ...mockLocation, lat: 999, lng: 999 })
    renderPage()
    await screen.findByText('Mi Tienda Artesanal')

    expect(screen.queryByRole('button', { name: /ubicación en el mapa/i })).not.toBeInTheDocument()
  })

  it('opens the location dialog from the map pin', async () => {
    vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /ubicación en el mapa/i }))

    const dialog = await screen.findByRole('dialog', { name: /ubicación del catálogo/i })
    expect(within(dialog).getByAltText(/mapa de la ubicación/i)).toBeInTheDocument()
    expect(
      within(dialog).getByText(/Calle Macedonio Alcalá 203, Centro, Oaxaca de Juárez, Oaxaca/),
    ).toBeInTheDocument()
  })

  it('offers a maps hand-off pointing at the pinned coordinates', async () => {
    vi.mocked(fetchCatalogLocation).mockResolvedValue(mockLocation)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /ubicación en el mapa/i }))

    const link = await screen.findByRole('link', { name: /abrir en mi app de mapas/i })
    // jsdom reports a desktop UA, so this is the non-iOS `geo:` branch.
    expect(link).toHaveAttribute('href', expect.stringContaining('17.0654,-96.7237'))
    expect(link.getAttribute('href')).toMatch(/^geo:/)
  })
})
