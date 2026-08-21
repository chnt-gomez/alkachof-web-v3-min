import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from '../TransactionsPage'
import { MIN_PENDING_MS } from '@/lib/pendingAction'
import type { TransactionListResult } from '../actions/fetchTransactions'
import type { PurchaseLine, TransactionSummary } from '../types'

vi.mock('../actions/fetchTransactions')
vi.mock('../actions/fetchTransactionPurchases')
vi.mock('../actions/updateTransactionStatus')
vi.mock('../actions/fetchCatalogSummaries')
vi.mock('../actions/fetchProfileSummaries')

// Requests are a separate entity rendered under the Servicios tab; stub the
// list call so the toggle can be exercised without the request stack.
vi.mock('@/sections/requests/actions/fetchRequests')
vi.mock('@/sections/requests/actions/updateRequestStatus')

// The detail dialog resolves a chat via the chat section's hook. Stub it (an
// out-of-section dependency) so no ChatProvider stack is needed; findChatWith
// returning undefined drives the "open a new draft" path.
const findChatWith = vi.fn<(userId: string) => { _id: string } | undefined>(() => undefined)
vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ findChatWith }),
}))

import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchTransactionPurchases } from '../actions/fetchTransactionPurchases'
import { updateTransactionStatus } from '../actions/updateTransactionStatus'
import { fetchCatalogSummaries } from '../actions/fetchCatalogSummaries'
import { fetchProfileSummaries } from '../actions/fetchProfileSummaries'
import { fetchRequests } from '@/sections/requests/actions/fetchRequests'
import type { ServiceRequest } from '@/sections/requests/types'

const ISO = new Date('2026-07-14T12:00:00Z').toISOString()

// Status changes are held for MIN_PENDING_MS while the button fills, so any
// assertion on the result has to outwait it (default findBy timeout is 1000ms,
// exactly the floor — too close to be reliable).
const HELD_MS = MIN_PENDING_MS + 1500

const sampleSummary = (overrides: Partial<TransactionSummary> = {}): TransactionSummary => ({
  id: 't1',
  status: 'EN-ROUTE',
  dateCreated: ISO,
  dateUpdated: ISO,
  purchaseIds: ['p1'],
  itemCount: 2,
  totalAmount: 45900,
  counterpartyId: 'u2',
  catalogId: 'cat1',
  ...overrides,
})

const listResult = (
  transactions: TransactionSummary[],
  total?: number,
): TransactionListResult => ({
  transactions,
  total: total ?? transactions.length,
  limit: 20,
  skip: 0,
})

const sampleLine = (overrides: Partial<PurchaseLine> = {}): PurchaseLine => ({
  id: 'l1',
  quantity: 2,
  totalPrice: 44000,
  item: {
    id: 'i1',
    name: 'Rebozo de Colores',
    imgPath: 'https://example.com/rebozo.jpg',
    price: 22000,
  },
  ...overrides,
})

/** Surfaces the current router location + nav state so navigation is assertable. */
function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="location">
      {location.pathname}
      <span data-testid="nav-state">{JSON.stringify(location.state)}</span>
    </div>
  )
}

function renderPage(entry = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TransactionsPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

/** Pedidos opens on Ventas, so buyer-side tests switch to Compras first. */
async function renderAsBuyer(entry = '/transactions') {
  const user = userEvent.setup()
  renderPage(entry)
  await user.click(await screen.findByRole('tab', { name: 'Compras' }))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  findChatWith.mockReturnValue(undefined)
  vi.mocked(fetchTransactions).mockResolvedValue(listResult([sampleSummary()]))
  vi.mocked(fetchTransactionPurchases).mockResolvedValue([sampleLine()])
  vi.mocked(fetchCatalogSummaries).mockResolvedValue({})
  vi.mocked(fetchProfileSummaries).mockResolvedValue({})
  vi.mocked(fetchRequests).mockResolvedValue([])
})

const sampleRequest = (overrides: Partial<ServiceRequest> = {}): ServiceRequest => ({
  id: 'r1',
  serviceId: 'svc1',
  buyerId: 'u1',
  sellerId: 'u2',
  catalogId: 'cat1',
  status: 'REQUESTED',
  finalPrice: null,
  customerNote: 'Cuatro ventanas.',
  dateCreated: ISO,
  dateUpdated: null,
  ...overrides,
})

describe('TransactionsPage', () => {
  it('lists the buyer transactions on the Compras tab', async () => {
    await renderAsBuyer()

    // Scope to the card so the assertion is about the badge, not the page.
    const card = await screen.findByRole('button', { name: /pedido de/i })
    expect(within(card).getByText('En camino')).toBeInTheDocument()
    expect(within(card).getByText('$459.00')).toBeInTheDocument()
    expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ role: 'buyer' }))
  })

  it('renders the shop name as the buyer row header, resolved from catalogId', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ catalogId: 'catABC' })]),
    )
    vi.mocked(fetchCatalogSummaries).mockResolvedValue({
      catABC: { catalogId: 'catABC', alias: 'Mi Tienda Demo' },
    })
    await renderAsBuyer()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    expect(within(card).getByText('Mi Tienda Demo')).toBeInTheDocument()
    expect(fetchCatalogSummaries).toHaveBeenCalledWith(['catABC'])
  })

  it('falls back to a generic label when a buyer row has no catalogId', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ catalogId: null })]),
    )
    await renderAsBuyer()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    expect(within(card).getByText('Catálogo')).toBeInTheDocument()
    // No id to resolve, so no batch lookup is attempted.
    expect(fetchCatalogSummaries).not.toHaveBeenCalled()
  })

  it('titles a seller row with the buyer name, resolved from counterpartyId', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ counterpartyId: 'buyerX' })]),
    )
    vi.mocked(fetchProfileSummaries).mockResolvedValue({
      buyerX: { userId: 'buyerX', alias: 'Ana Ramírez' },
    })
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))

    const card = await screen.findByRole('button', { name: /ana ramírez/i })
    expect(within(card).getByText('Pedido de Ana Ramírez')).toBeInTheDocument()
    expect(fetchProfileSummaries).toHaveBeenCalledWith(['buyerX'])
  })

  it('titles a buyer row with the shop alone — no "Pedido de" prefix', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(listResult([sampleSummary()]))
    vi.mocked(fetchCatalogSummaries).mockResolvedValue({
      cat1: { catalogId: 'cat1', alias: 'Rebozos Oaxaca' },
    })
    await renderAsBuyer()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    expect(within(card).getByText('Rebozos Oaxaca')).toBeInTheDocument()
  })

  it('refetches with the seller role when the Ventas tab is selected', async () => {
    renderPage()
    await screen.findByRole('button', { name: /pedido de/i })

    await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ role: 'seller' })),
    )
  })

  it('renders no status filter — the role tabs are the only control', async () => {
    renderPage()
    await screen.findByRole('button', { name: /pedido de/i })

    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entregado' })).not.toBeInTheDocument()
    // Both role tabs stay.
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('words the empty state for the role being viewed', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(listResult([]))
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText('Aún no has recibido ventas ni solicitudes.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Compras' }))

    expect(
      await screen.findByText('Aún no has realizado compras ni solicitudes.'),
    ).toBeInTheDocument()
  })

  it('opens the detail dialog with line items when a card is tapped', async () => {
    renderPage()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    await userEvent.click(card)

    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument()
    expect(await screen.findByText('Rebozo de Colores')).toBeInTheDocument()
    expect(screen.getByText('Cantidad: 2')).toBeInTheDocument()
  })

  it('opens a new chat draft with the counterparty from the detail dialog', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ counterpartyId: 'seller-1' })]),
    )
    renderPage()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    await userEvent.click(card)
    await userEvent.click(await screen.findByRole('button', { name: /enviar mensaje/i }))

    expect(findChatWith).toHaveBeenCalledWith('seller-1')
    expect(screen.getByTestId('location')).toHaveTextContent('/chats/new')
    expect(screen.getByTestId('nav-state')).toHaveTextContent('"toUserId":"seller-1"')
  })

  it('resumes the existing chat with the counterparty when one already exists', async () => {
    findChatWith.mockReturnValue({ _id: 'chat-99' })
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ counterpartyId: 'seller-1' })]),
    )
    renderPage()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    await userEvent.click(card)
    await userEvent.click(await screen.findByRole('button', { name: /enviar mensaje/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/chats/chat-99')
  })

  it('lets a seller advance a transaction status from the detail dialog', async () => {
    const started = sampleSummary({ id: 't-seller', status: 'STARTED' })
    vi.mocked(fetchTransactions).mockResolvedValue(listResult([started]))
    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 't-seller',
      purchaseIds: ['p1'],
      buyerId: 'u2',
      sellerId: 'me',
      status: 'PROCESSING',
      dateCreated: ISO,
      dateUpdated: ISO,
    })
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))
    const card = await screen.findByRole('button', { name: /pedido de/i })
    await userEvent.click(card)

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar en proceso' }))

    await waitFor(() =>
      expect(updateTransactionStatus).toHaveBeenCalledWith('t-seller', 'PROCESSING'),
    )
    // Status advanced in place: the PROCESSING actions replace the STARTED ones.
    expect(
      await screen.findByRole('button', { name: 'Marcar en camino' }, { timeout: HELD_MS }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar en proceso' })).not.toBeInTheDocument()
  })

  it('holds the status button as a progress bar while the change is in flight', async () => {
    const started = sampleSummary({ id: 't-seller', status: 'STARTED' })
    vi.mocked(fetchTransactions).mockResolvedValue(listResult([started]))
    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 't-seller',
      purchaseIds: ['p1'],
      buyerId: 'u2',
      sellerId: 'me',
      status: 'PROCESSING',
      dateCreated: ISO,
      dateUpdated: ISO,
    })
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))
    await userEvent.click(await screen.findByRole('button', { name: /pedido de/i }))

    // fireEvent, not userEvent: the latter awaits pending timers, which would
    // sit through the whole hold and miss the state being asserted.
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar en proceso' }))

    expect(
      screen.getByRole('progressbar', { name: /marcar en proceso: actualizando el pedido/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled()
  })

  it('does not render status actions for a buyer', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ status: 'EN-ROUTE' })]),
    )
    const user = await renderAsBuyer()

    const card = await screen.findByRole('button', { name: /pedido de/i })
    await user.click(card)

    await screen.findByText('Detalle del pedido')
    expect(screen.queryByText('Actualizar estado')).not.toBeInTheDocument()
  })

  it('accumulates the next page when load more is tapped', async () => {
    vi.mocked(fetchTransactions)
      .mockResolvedValueOnce(listResult([sampleSummary({ id: 't1' })], 2))
      .mockResolvedValueOnce(listResult([sampleSummary({ id: 't2', status: 'DELIVERED' })], 2))
    renderPage()

    await screen.findByRole('button', { name: /pedido de/i })
    await userEvent.click(screen.getByRole('button', { name: /cargar más/i }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  })

  it('highlights the transaction named by a notification deep-link', async () => {
    // jsdom has no layout engine, so scrollIntoView is undefined by default.
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.mocked(fetchTransactions).mockResolvedValue(
      listResult([sampleSummary({ id: 't1' }), sampleSummary({ id: 't2' })]),
    )
    renderPage('/transactions?transaction=t2')

    const cards = await screen.findAllByRole('button', { name: /pedido de/i })
    // The highlight class lands on the <li> wrapping the target's card.
    await waitFor(() =>
      expect(cards[1].closest('li')).toHaveClass('transaction-highlight'),
    )
    expect(cards[0].closest('li')).not.toHaveClass('transaction-highlight')
    // scrollIntoView fires from a requestAnimationFrame callback.
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })

  it('switches to the seller tab when the deep-link names role=seller', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    renderPage('/transactions?transaction=t1&role=seller')

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'seller' }),
      ),
    )
    expect(screen.getByRole('tab', { name: 'Ventas' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('surfaces a retryable error when both halves of the feed fail', async () => {
    vi.mocked(fetchTransactions).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(fetchRequests).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText('No pudimos cargar tus pedidos.')).toBeInTheDocument()

    vi.mocked(fetchTransactions).mockResolvedValueOnce(listResult([sampleSummary()]))
    vi.mocked(fetchRequests).mockResolvedValueOnce([])
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByRole('button', { name: /pedido de/i })).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar tus pedidos.')).not.toBeInTheDocument()
  })

  it('still shows what loaded when only one half fails, and says so', async () => {
    // Requests are down; product orders came back. Showing them silently would
    // present a partial feed as the whole truth.
    vi.mocked(fetchRequests).mockRejectedValue(new Error('boom'))
    renderPage()

    expect(await screen.findByRole('button', { name: /pedido de/i })).toBeInTheDocument()
    expect(
      screen.getByText('No pudimos cargar parte de tus pedidos. Puede que falten algunos.'),
    ).toBeInTheDocument()
    // Not the blanking full-page error.
    expect(screen.queryByText('No pudimos cargar tus pedidos.')).not.toBeInTheDocument()
  })

  describe('the merged feed', () => {
    it('lists product orders and service requests together, newest first', async () => {
      vi.mocked(fetchTransactions).mockResolvedValue(
        listResult([sampleSummary({ dateCreated: '2026-07-10T12:00:00Z' })]),
      )
      vi.mocked(fetchRequests).mockResolvedValue([
        sampleRequest({ dateCreated: '2026-07-14T12:00:00Z' }),
      ])
      renderPage()

      const rows = await screen.findAllByRole('listitem')
      expect(rows).toHaveLength(2)
      // The request is newer, so it sorts above the product order.
      expect(
        within(rows[0]).getByRole('button', { name: /solicitud (de|a)/i }),
      ).toBeInTheDocument()
      expect(within(rows[1]).getByRole('button', { name: /pedido de/i })).toBeInTheDocument()
    })

    it('offers no Productos / Servicios split — role is the only division', async () => {
      renderPage()
      await screen.findByRole('button', { name: /pedido de/i })

      expect(screen.queryByRole('tab', { name: 'Servicios' })).not.toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: 'Productos' })).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Compras' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Ventas' })).toBeInTheDocument()
    })

    it('sends both halves the seller role when Ventas is selected', async () => {
      renderPage()
      await screen.findByRole('button', { name: /pedido de/i })

      await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))

      await waitFor(() => {
        expect(fetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'seller' }),
        )
        expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({ role: 'seller' }))
      })
    })

    it('opens the right dialog for each kind of row', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([sampleRequest()])
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: /solicitud (de|a)/i }))
      expect(await screen.findByText('Detalle de la solicitud')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

      await userEvent.click(screen.getByRole('button', { name: /pedido de/i }))
      expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument()
    })
  })
})

describe('TransactionsPage role tabs', () => {
  it('opens on Ventas', async () => {
    renderPage()

    expect(await screen.findByRole('tab', { name: 'Ventas' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Compras' })).toHaveAttribute('aria-selected', 'false')
    expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ role: 'seller' }))
  })

  it('puts Ventas on the left and Compras on the right', async () => {
    renderPage()
    await screen.findByRole('tab', { name: 'Ventas' })

    const labels = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(labels).toEqual(['Ventas', 'Compras'])
  })

  // Mirrors the Home tabs: seller side green, buy side the #FF9100 signature.
  it('paints the active tab with its side of the app', async () => {
    const user = userEvent.setup()
    renderPage()

    const ventas = await screen.findByRole('tab', { name: 'Ventas' })
    expect(ventas).toHaveClass('bg-primary', 'text-primary-foreground')
    expect(screen.getByRole('tab', { name: 'Compras' }).className).not.toMatch(/bg-buy/)

    await user.click(screen.getByRole('tab', { name: 'Compras' }))

    expect(screen.getByRole('tab', { name: 'Compras' })).toHaveClass('bg-buy', 'text-buy-ink')
    expect(screen.getByRole('tab', { name: 'Ventas' }).className).not.toMatch(/bg-primary/)
  })
})
