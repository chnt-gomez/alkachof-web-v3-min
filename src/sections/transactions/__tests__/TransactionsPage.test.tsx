import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from '../TransactionsPage'
import type { TransactionListResult } from '../actions/fetchTransactions'
import type { PurchaseLine, TransactionSummary } from '../types'

vi.mock('../actions/fetchTransactions')
vi.mock('../actions/fetchTransactionPurchases')

import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchTransactionPurchases } from '../actions/fetchTransactionPurchases'

const ISO = new Date('2026-07-14T12:00:00Z').toISOString()

const sampleSummary = (overrides: Partial<TransactionSummary> = {}): TransactionSummary => ({
  id: 't1',
  status: 'EN-ROUTE',
  dateCreated: ISO,
  dateUpdated: ISO,
  purchaseIds: ['p1'],
  itemCount: 2,
  totalAmount: 45900,
  counterpartyId: 'u2',
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/transactions']}>
      <TransactionsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchTransactions).mockResolvedValue(listResult([sampleSummary()]))
  vi.mocked(fetchTransactionPurchases).mockResolvedValue([sampleLine()])
})

describe('TransactionsPage', () => {
  it('lists the buyer transactions by default', async () => {
    renderPage()

    // Scope to the card so the status badge is not confused with the filter chip.
    const card = await screen.findByRole('button', { name: /pedido del/i })
    expect(within(card).getByText('En camino')).toBeInTheDocument()
    expect(within(card).getByText('$459.00')).toBeInTheDocument()
    expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ role: 'buyer' }))
  })

  it('refetches with the seller role when the Ventas tab is selected', async () => {
    renderPage()
    await screen.findByRole('button', { name: /pedido del/i })

    await userEvent.click(screen.getByRole('tab', { name: 'Ventas' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ role: 'seller' })),
    )
  })

  it('filters by status when a chip is selected', async () => {
    renderPage()
    await screen.findByRole('button', { name: /pedido del/i })

    await userEvent.click(screen.getByRole('button', { name: 'Entregado' }))

    await waitFor(() =>
      expect(fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DELIVERED' }),
      ),
    )
  })

  it('shows an empty state when there are no transactions', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue(listResult([]))
    renderPage()

    expect(await screen.findByText('Aún no has realizado compras.')).toBeInTheDocument()
  })

  it('opens the detail dialog with line items when a card is tapped', async () => {
    renderPage()

    const card = await screen.findByRole('button', { name: /pedido del/i })
    await userEvent.click(card)

    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument()
    expect(await screen.findByText('Rebozo de Colores')).toBeInTheDocument()
    expect(screen.getByText('Cantidad: 2')).toBeInTheDocument()
  })

  it('accumulates the next page when load more is tapped', async () => {
    vi.mocked(fetchTransactions)
      .mockResolvedValueOnce(listResult([sampleSummary({ id: 't1' })], 2))
      .mockResolvedValueOnce(listResult([sampleSummary({ id: 't2', status: 'DELIVERED' })], 2))
    renderPage()

    await screen.findByRole('button', { name: /pedido del/i })
    await userEvent.click(screen.getByRole('button', { name: /cargar más/i }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  })

  it('surfaces a retryable error when the list fails to load', async () => {
    vi.mocked(fetchTransactions).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText('No pudimos cargar tus pedidos.')).toBeInTheDocument()

    vi.mocked(fetchTransactions).mockResolvedValueOnce(listResult([sampleSummary()]))
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByRole('button', { name: /pedido del/i })).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar tus pedidos.')).not.toBeInTheDocument()
  })
})
