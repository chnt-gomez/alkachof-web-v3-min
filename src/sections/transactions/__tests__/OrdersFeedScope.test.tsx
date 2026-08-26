import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from '../TransactionsPage'
import type { TransactionListResult } from '../actions/fetchTransactions'
import type { TransactionSummary } from '../types'
import type { ServiceRequest } from '@/sections/requests/types'

vi.mock('../actions/fetchTransactions')
vi.mock('../actions/fetchTransactionPurchases')
vi.mock('../actions/updateTransactionStatus')
vi.mock('../actions/fetchCatalogSummaries')
vi.mock('../actions/fetchProfileSummaries')
vi.mock('@/sections/requests/actions/fetchRequests')
vi.mock('@/sections/requests/actions/updateRequestStatus')

vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ findChatWith: () => undefined }),
}))

vi.mock('@/sections/catalog/actions/fetchItem', () => ({
  fetchItem: vi.fn(async (id: string) => ({
    _id: id,
    name: 'Servicio',
    description: '',
    price: 0,
    imgPath: '',
    outOfStock: false,
    updatedOn: '2026-08-01T00:00:00Z',
    catalogId: 'cat1',
    type: 'service' as const,
  })),
}))

import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchCatalogSummaries } from '../actions/fetchCatalogSummaries'
import { fetchProfileSummaries } from '../actions/fetchProfileSummaries'
import { fetchRequests } from '@/sections/requests/actions/fetchRequests'

const ISO = '2026-07-14T12:00:00Z'

const summary = (overrides: Partial<TransactionSummary> = {}): TransactionSummary => ({
  id: 't1',
  status: 'EN-ROUTE',
  dateCreated: ISO,
  dateUpdated: ISO,
  purchaseIds: ['p1'],
  itemCount: 1,
  totalAmount: 1000,
  counterpartyId: 'u2',
  catalogId: 'cat1',
  ...overrides,
})

const request = (overrides: Partial<ServiceRequest> = {}): ServiceRequest => ({
  id: 'r1',
  serviceId: 'svc1',
  buyerId: 'buyer1',
  sellerId: 'seller1',
  catalogId: 'cat1',
  status: 'REQUESTED',
  finalPrice: null,
  customerNote: '',
  dateCreated: ISO,
  dateUpdated: null,
  ...overrides,
})

const transactionPage = (
  transactions: TransactionSummary[],
  total = transactions.length,
): TransactionListResult => ({ transactions, total, limit: 20, skip: 0 })

const requestPage = (requests: ServiceRequest[], total = requests.length) => ({
  requests,
  total,
  limit: 20,
  skip: 0,
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/transactions']}>
      <TransactionsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCatalogSummaries).mockResolvedValue({})
  vi.mocked(fetchProfileSummaries).mockResolvedValue({})
  vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary()]))
  vi.mocked(fetchRequests).mockResolvedValue(requestPage([]))
})

describe('Pedidos feed — active vs history', () => {
  it('reads the active feed by default, for both kinds of order', async () => {
    renderPage()

    await waitFor(() => expect(fetchTransactions).toHaveBeenCalled())
    expect(fetchTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'active' }),
    )
    expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({ scope: 'active' }))
  })

  // Both halves must switch together: a screen showing active products beside
  // archived services would be incoherent.
  it('switches both halves to the history together', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Ver más antiguos' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'history' }),
      ),
    )
    expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({ scope: 'history' }))
  })

  it('offers a way back to the active list once showing the history', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Ver más antiguos' }))
    const back = await screen.findByRole('button', { name: 'Regresar a recientes' })
    expect(back).toHaveAttribute('aria-pressed', 'true')

    await user.click(back)

    expect(await screen.findByRole('button', { name: 'Ver más antiguos' })).toBeInTheDocument()
  })

  it('reaches the history from the empty active list', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([]))
    const user = userEvent.setup()
    renderPage()

    // Wait for the empty state itself: the header toggle carries the same label
    // and renders before the data lands, so a findAllBy would resolve on that
    // one alone and click the wrong control.
    await screen.findByText('No tienes ventas ni solicitudes activas.')

    // The header toggle and the empty state's own call to action share a label
    // deliberately — same action, same words. Click the one in the empty state.
    const buttons = screen.getAllByRole('button', { name: 'Ver más antiguos' })
    expect(buttons).toHaveLength(2)
    await user.click(buttons[1])

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'history' }),
      ),
    )
  })
})

describe('Pedidos feed — paging both halves', () => {
  // Requests used to arrive whole, so "Cargar más" only paged products. Both
  // halves paginate now and a page left in either one has to be reachable.
  it('offers "Cargar más" when only the requests half has another page', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary()], 1))
    vi.mocked(fetchRequests).mockResolvedValue(requestPage([request()], 5))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Cargar más' })).toBeInTheDocument()
  })

  it('asks each half that still has rows for its next page', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary()], 4))
    vi.mocked(fetchRequests).mockResolvedValue(requestPage([request()], 4))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cargar más' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ skip: 1 })),
    )
    expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({ skip: 1 }))
  })

  // Asking an exhausted half for "the next page" would refetch its last one and
  // duplicate rows in the merged list.
  it('does not ask a half that has no more rows', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary()], 4))
    vi.mocked(fetchRequests).mockResolvedValue(requestPage([request()], 1))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cargar más' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ skip: 1 })),
    )
    expect(fetchRequests).not.toHaveBeenCalledWith(expect.objectContaining({ skip: 1 }))
  })

  // A row that un-archives between two page calls shifts the window, so the
  // server can legitimately hand back a row the client already holds.
  it('does not render a row twice when a page overlaps the previous one', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary({ id: 't1' })], 4))
    vi.mocked(fetchRequests).mockResolvedValue(requestPage([], 0))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cargar más' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ skip: 1 })),
    )
    // The stub returns the same row for page 2; it must appear once.
    expect(await screen.findAllByRole('button', { name: /pedido de/i })).toHaveLength(1)
  })

  it('hides "Cargar más" once both halves are exhausted', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(transactionPage([summary()], 1))
    vi.mocked(fetchRequests).mockResolvedValue(requestPage([request()], 1))
    renderPage()

    await screen.findByRole('button', { name: /pedido de/i })
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })
})
