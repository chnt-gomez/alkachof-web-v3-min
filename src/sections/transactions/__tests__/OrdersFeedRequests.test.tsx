import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TransactionsPage } from '../TransactionsPage'
import { MIN_PENDING_MS } from '@/lib/pendingAction'
import type { RequestStatus, ServiceRequest } from '@/sections/requests/types'

vi.mock('@/sections/requests/actions/fetchRequests')
vi.mock('@/sections/requests/actions/updateRequestStatus')

// Product orders share the feed but aren't the subject here.
vi.mock('../actions/fetchTransactions')
vi.mock('../actions/fetchTransactionPurchases')
vi.mock('../actions/updateTransactionStatus')
vi.mock('../actions/fetchCatalogSummaries')
vi.mock('../actions/fetchProfileSummaries')

// The detail dialog opens a chat with the counterparty; not exercised here.
vi.mock('@/sections/chat/useChat', () => ({
  useChat: () => ({ findChatWith: () => undefined }),
}))

vi.mock('@/sections/catalog/actions/fetchItem', () => ({
  fetchItem: vi.fn(async (id: string) => ({
    _id: id,
    name: 'Instalación de Cortinas',
    description: '',
    price: 0,
    imgPath: '',
    outOfStock: false,
    updatedOn: '2026-08-01T00:00:00Z',
    catalogId: 'cat1',
    type: 'service' as const,
  })),
}))

import { fetchRequests } from '@/sections/requests/actions/fetchRequests'
import { updateRequestStatus } from '@/sections/requests/actions/updateRequestStatus'
import { fetchTransactions } from '../actions/fetchTransactions'
import { fetchCatalogSummaries } from '../actions/fetchCatalogSummaries'
import { fetchProfileSummaries } from '../actions/fetchProfileSummaries'

// Status changes are held for MIN_PENDING_MS while the button fills, so any
// assertion on the result has to outwait it (default findBy timeout is 1000ms,
// exactly the floor — too close to be reliable).
const HELD_MS = MIN_PENDING_MS + 1500

const base: ServiceRequest = {
  id: 'req1',
  serviceId: 'svc1',
  buyerId: 'buyer1',
  sellerId: 'seller1',
  catalogId: 'cat1',
  status: 'REQUESTED',
  finalPrice: null,
  customerNote: 'Son 4 ventanas en la sala.',
  dateCreated: '2026-08-18T10:00:00Z',
  dateUpdated: null,
}

const at = (status: RequestStatus, finalPrice: number | null = null): ServiceRequest => ({
  ...base,
  status,
  finalPrice,
})

function renderPage(entry = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TransactionsPage />
    </MemoryRouter>,
  )
}

/** Renders Pedidos on the given role tab. The page opens on Ventas. */
async function renderAs(role: 'buyer' | 'seller') {
  const user = userEvent.setup()
  renderPage()
  if (role === 'buyer') {
    await user.click(await screen.findByRole('tab', { name: 'Compras' }))
  }
  return user
}

/** Renders Pedidos and opens the first request's detail dialog. */
async function openFirstRequest(role: 'buyer' | 'seller' = 'seller') {
  const user = await renderAs(role)
  // The card names the other party, so the label reads "de …" on Ventas and
  // "a …" on Compras.
  await user.click(await screen.findByRole('button', { name: /Solicitud (de|a)/i }))
  return user
}

/** The open detail dialog. */
const dialog = () =>
  within(screen.getByRole('dialog', { name: 'Detalle de la solicitud' }))

/** The note dialog that turning a quote down opens. */
const rejectDialog = () => within(screen.getByRole('dialog', { name: 'Rechazar precio' }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchRequests).mockResolvedValue([base])
  vi.mocked(fetchTransactions).mockResolvedValue({
    transactions: [],
    total: 0,
    limit: 20,
    skip: 0,
  })
  vi.mocked(fetchCatalogSummaries).mockResolvedValue({})
  vi.mocked(fetchProfileSummaries).mockResolvedValue({})
})

describe('request notification deep-links', () => {
  // The API points request notifications at this page — requests have no page of
  // their own — with `?highlight=<requestId>&role=<recipient's role>`.
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('highlights the request named by the notification', async () => {
    renderPage('/transactions?highlight=req1&role=seller')

    const card = await screen.findByRole('button', { name: /Solicitud de/i })
    await waitFor(() => expect(card.closest('li')).toHaveClass('transaction-highlight'))
  })

  // A priced-quote notification goes to the buyer, and the page opens on Ventas.
  it('switches to Compras when the notification names the buyer side', async () => {
    vi.mocked(fetchRequests).mockImplementation(async ({ role }) =>
      role === 'buyer' ? [at('PRICED', 95000)] : [],
    )
    renderPage('/transactions?highlight=req1&role=buyer')

    const card = await screen.findByRole('button', { name: /Solicitud a/i })
    await waitFor(() => expect(card.closest('li')).toHaveClass('transaction-highlight'))
    expect(screen.getByRole('tab', { name: 'Compras' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  // The deep-link switches tabs while the first tab's fetch is still in flight.
  // If that late answer is allowed to land, it overwrites the tab the user is
  // actually looking at — with the seller's empty list, here.
  it('ignores the first tab\'s response when it lands after the switch', async () => {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
    vi.mocked(fetchRequests).mockImplementation(async ({ role }) => {
      if (role === 'seller') {
        await delay(60)
        return []
      }
      await delay(10)
      return [at('PRICED', 95000)]
    })
    renderPage('/transactions?highlight=req1&role=buyer')

    const card = await screen.findByRole('button', { name: /Solicitud a/i })
    // Still there once the stale seller response has had time to arrive.
    await delay(120)
    expect(card).toBeInTheDocument()
    expect(screen.getByText('Instalación de Cortinas')).toBeInTheDocument()
  })

  // Notifications stored before the API started sending `role` have none, and
  // the page opens on Ventas — so a purchase must still be found.
  it('looks in the other tab when the notification names no role', async () => {
    vi.mocked(fetchRequests).mockImplementation(async ({ role }) =>
      role === 'buyer' ? [base] : [],
    )
    renderPage('/transactions?highlight=req1')

    const card = await screen.findByRole('button', { name: /Solicitud a/i })
    await waitFor(() => expect(card.closest('li')).toHaveClass('transaction-highlight'))
    expect(screen.getByRole('tab', { name: 'Compras' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

describe('service requests in the Pedidos feed', () => {
  it('lists a request with its status and unquoted price', async () => {
    await renderAs('seller')

    expect(await screen.findByText('Instalación de Cortinas')).toBeInTheDocument()
    // Scoped to the list, which is where a status now reads only once.
    const list = within(screen.getByRole('list'))
    expect(list.getByText('Esperando cotización')).toBeInTheDocument()
    expect(list.getByText('Precio a convenir')).toBeInTheDocument()
  })

  it('names the buyer under the service title on Ventas', async () => {
    vi.mocked(fetchProfileSummaries).mockResolvedValue({
      buyer1: { userId: 'buyer1', alias: 'Ana Ramírez' },
    })
    await renderAs('seller')

    expect(await screen.findByText('Solicitud de Ana Ramírez')).toBeInTheDocument()
    expect(fetchProfileSummaries).toHaveBeenCalledWith(['buyer1'])
    // The brief lives in the detail dialog; the card stays spare.
    expect(screen.queryByText('Son 4 ventanas en la sala.')).not.toBeInTheDocument()
  })

  it('names the seller instead on Compras — the buyer is the user themself', async () => {
    vi.mocked(fetchProfileSummaries).mockResolvedValue({
      seller1: { userId: 'seller1', alias: 'Taller Don Chuy' },
    })
    await renderAs('buyer')

    expect(await screen.findByText('Solicitud a Taller Don Chuy')).toBeInTheDocument()
    expect(fetchProfileSummaries).toHaveBeenCalledWith(['seller1'])
  })

  it('falls back to a generic label when the other party cannot be resolved', async () => {
    await renderAs('seller')

    expect(await screen.findByText('Solicitud de un comprador')).toBeInTheDocument()
  })

  it("shows the buyer's note to the seller, since it is their only pricing context", async () => {
    await openFirstRequest('seller')

    expect(dialog().getByText('Detalles del comprador')).toBeInTheDocument()
    expect(dialog().getByText('Son 4 ventanas en la sala.')).toBeInTheDocument()
  })

  it('carries the sub-header into the dialog, naming the buyer on Ventas', async () => {
    vi.mocked(fetchProfileSummaries).mockResolvedValue({
      buyer1: { userId: 'buyer1', alias: 'Ana Ramírez' },
    })
    await openFirstRequest('seller')

    expect(await dialog().findByText('Solicitud de Ana Ramírez')).toBeInTheDocument()
  })

  it('names the seller in the dialog on Compras', async () => {
    vi.mocked(fetchProfileSummaries).mockResolvedValue({
      seller1: { userId: 'seller1', alias: 'Taller Don Chuy' },
    })
    await openFirstRequest('buyer')

    expect(await dialog().findByText('Solicitud a Taller Don Chuy')).toBeInTheDocument()
  })

  describe('seller quoting', () => {
    it('moves the request to PRICED with the price in cents', async () => {
      vi.mocked(updateRequestStatus).mockResolvedValue(at('PRICED', 95000))
      const user = await openFirstRequest('seller')

      // The input is on screen from the start: typing and one tap is the whole
      // flow, no reveal step in between.
      await user.type(dialog().getByLabelText(/precio del servicio/i), '950')
      await user.click(dialog().getByRole('button', { name: 'Fijar precio' }))

      expect(updateRequestStatus).toHaveBeenCalledWith('req1', 'PRICED', 95000, undefined)
      expect(await dialog().findByText('$950.00', {}, { timeout: HELD_MS })).toBeInTheDocument()
      expect(dialog().getByText('Cotizado')).toBeInTheDocument()
    })

    it('keeps the pricing screen to the brief, the input and the action', async () => {
      await openFirstRequest('seller')

      expect(dialog().getByText(/con la información de la nota de tu cliente/i)).toBeInTheDocument()
      // Nothing that only restates the button or the absence of a price.
      expect(dialog().queryByText(/propón un precio/i)).not.toBeInTheDocument()
      expect(dialog().queryByRole('link', { name: /catálogo/i })).not.toBeInTheDocument()
      expect(dialog().queryByText('Precio a convenir')).not.toBeInTheDocument()
      expect(dialog().queryByText('Precio')).not.toBeInTheDocument()
    })

    it('refuses a blank or zero price rather than sending it', async () => {
      const user = await openFirstRequest('seller')

      await user.click(dialog().getByRole('button', { name: 'Fijar precio' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/precio mayor a cero/i)
      expect(updateRequestStatus).not.toHaveBeenCalled()

      await user.type(dialog().getByLabelText(/precio del servicio/i), '0')
      await user.click(dialog().getByRole('button', { name: 'Fijar precio' }))
      expect(updateRequestStatus).not.toHaveBeenCalled()
    })

    it('holds the button as a progress bar while the quote is in flight', async () => {
      vi.mocked(updateRequestStatus).mockResolvedValue(at('PRICED', 95000))
      const user = await openFirstRequest('seller')

      await user.type(dialog().getByLabelText(/precio del servicio/i), '950')
      // fireEvent, not user.click: userEvent awaits pending timers, which would
      // sit through the whole hold and miss the state being asserted.
      fireEvent.click(dialog().getByRole('button', { name: 'Fijar precio' }))

      expect(dialog().getByRole('progressbar', { name: /fijando el precio/i })).toBeInTheDocument()
      expect(dialog().getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    })

    it('has nothing to do while the buyer holds a quote', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      await openFirstRequest('seller')

      // PRICED is entirely the buyer's move — the seller cannot re-quote,
      // accept, or reject from here.
      expect(dialog().queryByRole('button', { name: 'Fijar precio' })).not.toBeInTheDocument()
      expect(dialog().queryByRole('button', { name: /aceptar/i })).not.toBeInTheDocument()
      expect(dialog().queryByRole('button', { name: /rechazar/i })).not.toBeInTheDocument()
      expect(dialog().getByText(/el comprador debe aceptarlo/i)).toBeInTheDocument()
    })

    it('starts the work once the buyer has accepted', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('ACCEPTED', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue(at('SERVING', 95000))
      const user = await openFirstRequest('seller')

      await user.click(dialog().getByRole('button', { name: 'Iniciar servicio' }))

      // No price on a later transition — the API would ignore it anyway.
      expect(updateRequestStatus).toHaveBeenCalledWith('req1', 'SERVING', undefined, undefined)
    })
  })

  describe('buyer decisions', () => {
    it('never offers the pricing form', async () => {
      await openFirstRequest('buyer')

      expect(dialog().queryByRole('button', { name: 'Fijar precio' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/precio del servicio/i)).not.toBeInTheDocument()
      expect(dialog().getByText('Tus detalles')).toBeInTheDocument()
      // Their only move on a fresh request is to cancel it.
      expect(dialog().getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })

    it('accepts a quote, moving it to ACCEPTED', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue(at('ACCEPTED', 95000))
      const user = await openFirstRequest('buyer')

      expect(dialog().getByText('$950.00')).toBeInTheDocument()
      await user.click(dialog().getByRole('button', { name: 'Aceptar precio' }))

      expect(updateRequestStatus).toHaveBeenCalledWith('req1', 'ACCEPTED', undefined, undefined)
      expect(await dialog().findByText('Aceptado', {}, { timeout: HELD_MS })).toBeInTheDocument()
    })

    it('holds the buyer\'s own moves the same way — the standard is role-blind', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue(at('ACCEPTED', 95000))
      await openFirstRequest('buyer')

      fireEvent.click(dialog().getByRole('button', { name: 'Aceptar precio' }))

      expect(
        dialog().getByRole('progressbar', { name: /aceptar precio: actualizando la solicitud/i }),
      ).toBeInTheDocument()
      expect(dialog().getByRole('button', { name: 'Actualizando…' })).toBeDisabled()
    })

    it('turns a quote down, sending it back for a fresh one with no price', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      // The server clears finalPrice on the way back to REQUESTED.
      vi.mocked(updateRequestStatus).mockResolvedValue(at('REQUESTED', null))
      const user = await openFirstRequest('buyer')

      await user.click(dialog().getByRole('button', { name: 'Rechazar precio' }))
      // Rejecting goes through its own dialog now; keeping the note is one tap.
      await user.click(rejectDialog().getByRole('button', { name: 'Rechazar precio' }))

      expect(updateRequestStatus).toHaveBeenCalledWith(
        'req1',
        'REQUESTED',
        undefined,
        'Son 4 ventanas en la sala.',
      )
      // The detail view comes back once the change lands. It trusts the
      // server's echo, so the price — and the whole row it sat in — disappears.
      await screen.findByRole(
        'dialog',
        { name: 'Detalle de la solicitud' },
        { timeout: HELD_MS },
      )
      expect(dialog().getByText('Esperando cotización')).toBeInTheDocument()
      expect(dialog().queryByText('$950.00')).not.toBeInTheDocument()
      expect(dialog().queryByText('Precio')).not.toBeInTheDocument()
    })

    it('offers the current note, pre-filled and selected, before rejecting', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      const user = await openFirstRequest('buyer')

      await user.click(dialog().getByRole('button', { name: 'Rechazar precio' }))

      const note = rejectDialog().getByLabelText(/detalles para el vendedor/i)
      expect(note).toHaveValue('Son 4 ventanas en la sala.')
      // Selected on open, so typing replaces it and no tap is needed to keep it.
      expect(note).toHaveFocus()
      expect((note as HTMLTextAreaElement).selectionStart).toBe(0)
      expect((note as HTMLTextAreaElement).selectionEnd).toBe('Son 4 ventanas en la sala.'.length)
      // Nothing is sent until the buyer confirms in here.
      expect(updateRequestStatus).not.toHaveBeenCalled()
    })

    it('sends the rewritten note with the rejection', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue({
        ...at('REQUESTED', null),
        customerNote: 'Ahora son 6 ventanas.',
      })
      const user = await openFirstRequest('buyer')

      await user.click(dialog().getByRole('button', { name: 'Rechazar precio' }))
      await user.clear(rejectDialog().getByLabelText(/detalles para el vendedor/i))
      await user.type(
        rejectDialog().getByLabelText(/detalles para el vendedor/i),
        'Ahora son 6 ventanas.',
      )
      await user.click(rejectDialog().getByRole('button', { name: 'Rechazar precio' }))

      expect(updateRequestStatus).toHaveBeenCalledWith(
        'req1',
        'REQUESTED',
        undefined,
        'Ahora son 6 ventanas.',
      )
      // Back on the detail view, showing the note the server echoed.
      await screen.findByRole(
        'dialog',
        { name: 'Detalle de la solicitud' },
        { timeout: HELD_MS },
      )
      expect(dialog().getByText('Ahora son 6 ventanas.')).toBeInTheDocument()
    })

    it('backs out of the rejection without sending', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      const user = await openFirstRequest('buyer')

      await user.click(dialog().getByRole('button', { name: 'Rechazar precio' }))
      await user.click(rejectDialog().getByRole('button', { name: 'Atrás' }))

      expect(updateRequestStatus).not.toHaveBeenCalled()
      // The quote is still on the table.
      expect(dialog().getByText('$950.00')).toBeInTheDocument()
    })

    it('holds the reject button as a progress bar while it is in flight', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('PRICED', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue(at('REQUESTED', null))
      const user = await openFirstRequest('buyer')

      await user.click(dialog().getByRole('button', { name: 'Rechazar precio' }))
      fireEvent.click(rejectDialog().getByRole('button', { name: 'Rechazar precio' }))

      expect(
        rejectDialog().getByRole('progressbar', { name: /rechazando el precio/i }),
      ).toBeInTheDocument()
      expect(rejectDialog().getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    })

    it('cannot start the work itself once accepted', async () => {
      vi.mocked(fetchRequests).mockResolvedValue([at('ACCEPTED', 95000)])
      await openFirstRequest('buyer')

      expect(dialog().queryByRole('button', { name: 'Iniciar servicio' })).not.toBeInTheDocument()
      expect(dialog().getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })
  })

  it.each(['buyer', 'seller'] as const)(
    'lets the %s complete a job in progress',
    async (role) => {
      vi.mocked(fetchRequests).mockResolvedValue([at('SERVING', 95000)])
      vi.mocked(updateRequestStatus).mockResolvedValue(at('COMPLETED', 95000))
      const user = await openFirstRequest(role)

      await user.click(dialog().getByRole('button', { name: 'Marcar completado' }))

      expect(updateRequestStatus).toHaveBeenCalledWith('req1', 'COMPLETED', undefined, undefined)
    },
  )

  it('offers no actions on a terminal request', async () => {
    vi.mocked(fetchRequests).mockResolvedValue([at('COMPLETED', 95000)])
    await openFirstRequest('seller')

    expect(dialog().queryByText('Acciones')).not.toBeInTheDocument()
    expect(dialog().getByText('$950.00')).toBeInTheDocument()
  })

  it('shows a combined empty state when neither kind has rows', async () => {
    vi.mocked(fetchRequests).mockResolvedValue([])
    await renderAs('seller')
    expect(
      await screen.findByText('Aún no has recibido ventas ni solicitudes.'),
    ).toBeInTheDocument()
  })
})
