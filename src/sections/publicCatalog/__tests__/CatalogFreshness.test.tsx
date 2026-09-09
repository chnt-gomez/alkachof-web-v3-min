import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicCatalogPage } from '../PublicCatalogPage'
import { CartProvider } from '@/sections/cart/context/CartContext'
import { ToastProvider } from '@/components/ui/toast'
import { createTestQueryClient } from '@/test/renderWithProviders'
import type { Catalog } from '../actions/fetchPublicCatalog'
import type { Item } from '../actions/fetchCatalogItems'

/*
  The freshness gate. A shop belongs to someone else, so its cached copy cannot be
  trusted the way the viewer's own rows are — `GET /updated/:id` is what makes it
  cacheable at all: one ~80-byte read decides whether the copy we hold is still
  the shop.

  Every assertion here is on how many times an *action* ran. That is the only
  thing this feature is about.
*/

vi.mock('../actions/fetchPublicCatalog')
vi.mock('../actions/fetchCatalogItems')
vi.mock('../actions/fetchCatalogQuestions')
vi.mock('../actions/fetchCatalogUpdated')
vi.mock('../actions/fetchCatalogLocation')
vi.mock('../actions/fetchUserSubscriptions')
vi.mock('@/sections/chat/useChat', () => ({ useChat: () => ({ findChatWith: () => undefined }) }))
vi.mock('@/sections/auth/useAuth', () => ({
  useAuth: () => ({
    profile: null,
    isAuthenticated: false,
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
import { fetchCatalogUpdated } from '../actions/fetchCatalogUpdated'
import { fetchCatalogLocation } from '../actions/fetchCatalogLocation'
import { fetchUserSubscriptions } from '../actions/fetchUserSubscriptions'

const CATALOG_ID = 'shop1'
const STAMP_A = '2026-09-08T14:22:31.004Z'
const STAMP_B = '2026-09-09T10:00:00.000Z'

const catalog: Catalog = {
  _id: CATALOG_ID,
  userId: 'seller1',
  alias: 'Tienda de Ana',
  welcomeText: 'Bienvenidos',
  description: '',
  payOptions: ['cash'],
  deliveryType: ['delivery'],
  location: '',
  locationZip: '',
  deliveryDates: [],
  deliveryLocations: [],
}

const items: Item[] = [
  {
    _id: 'item1',
    name: 'Bolsa tejida',
    description: '',
    price: 35000,
    imgPath: '',
    outOfStock: false,
    updatedOn: '2026-01-01T00:00:00Z',
    catalogId: CATALOG_ID,
  },
]

/** One client across renders, so a "revisit" sees what the first visit cached. */
const client = createTestQueryClient()

function renderPage() {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[`/catalog/${CATALOG_ID}`]}>
            <Routes>
              <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

/** Renders, waits for the shop, and lets the gate record its baseline stamp. */
async function visit() {
  const view = renderPage()
  await screen.findByText('Tienda de Ana')
  await waitFor(() => expect(fetchCatalogUpdated).toHaveBeenCalled())
  return view
}

/**
 * The 30s freshness window elapsing.
 *
 * The stamp's `staleTime` matches the server's `Cache-Control: max-age=30`, so a
 * revisit inside that window does not re-read it at all — a fetch there would be
 * served from the browser's HTTP cache and could not learn anything. Marking it
 * stale is how a test reaches the interesting case without a fake clock.
 */
function stampWindowElapses() {
  return client.invalidateQueries({ queryKey: ['catalog', 'stamp', CATALOG_ID] })
}

beforeEach(() => {
  vi.clearAllMocks()
  client.clear()
  vi.mocked(fetchPublicCatalog).mockResolvedValue(catalog)
  vi.mocked(fetchCatalogItems).mockResolvedValue(items)
  vi.mocked(fetchCatalogQuestions).mockResolvedValue([])
  vi.mocked(fetchCatalogLocation).mockResolvedValue(null)
  vi.mocked(fetchUserSubscriptions).mockResolvedValue([])
  vi.mocked(fetchCatalogUpdated).mockResolvedValue({ catalogId: CATALOG_ID, updated: STAMP_A })
})

const location = {
  _id: 'loc1',
  lat: 17.06,
  lng: -96.72,
  street_name: 'Macedonio Alcalá',
  city: 'Oaxaca',
  state: 'Oaxaca',
  number: '100',
  additional_number: '',
  neighborhood: 'Centro',
  catalogId: CATALOG_ID,
  zoneId: null,
}

describe('public catalog freshness', () => {
  // The first visit must not pay twice: the payload is fetched once and the
  // stamp it arrived with becomes its baseline, rather than looking like a
  // change that needs re-fetching.
  it('adopts the stamp on a first visit without refetching', async () => {
    const { unmount } = await visit()

    expect(fetchPublicCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
    unmount()
  })

  // A revisit inside the 30s window costs nothing at all — not even the stamp.
  it('costs nothing on a revisit inside the freshness window', async () => {
    const { unmount } = await visit()
    unmount()

    await visit()

    expect(fetchPublicCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
    expect(fetchCatalogUpdated).toHaveBeenCalledTimes(1)
  })

  // The headline: a shop that has not changed is not re-read. One stamp is the
  // whole cost of coming back.
  it('serves a revisit from cache when the stamp is unchanged', async () => {
    const { unmount } = await visit()
    unmount()
    await stampWindowElapses()

    await visit()

    await waitFor(() => expect(fetchCatalogUpdated).toHaveBeenCalledTimes(2))
    expect(fetchPublicCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
    expect(fetchCatalogQuestions).toHaveBeenCalledTimes(1)
  })

  // One stamp covers metadata, items and questions together, so a change
  // refetches all three.
  it('refetches the whole shop when the stamp changed', async () => {
    const { unmount } = await visit()
    unmount()
    await stampWindowElapses()
    vi.mocked(fetchCatalogUpdated).mockResolvedValue({ catalogId: CATALOG_ID, updated: STAMP_B })

    await visit()

    await waitFor(() => expect(fetchPublicCatalog).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(fetchCatalogItems).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(fetchCatalogQuestions).toHaveBeenCalledTimes(2))
  })

  // The stamp is the server's wall clock. If it ever steps backward — an NTP
  // correction, a host migration — ordering would pin us to stale data forever,
  // so the comparison is inequality.
  it('refetches when the stamp moves backward, not only forward', async () => {
    vi.mocked(fetchCatalogUpdated).mockResolvedValue({ catalogId: CATALOG_ID, updated: STAMP_B })
    const { unmount } = await visit()
    unmount()
    await stampWindowElapses()
    vi.mocked(fetchCatalogUpdated).mockResolvedValue({ catalogId: CATALOG_ID, updated: STAMP_A })

    await visit()

    await waitFor(() => expect(fetchPublicCatalog).toHaveBeenCalledTimes(2))
  })

  /* --- The location, which the stamp does not cover ----------------------- */

  /*
    Editing a location does not move the server's stamp, so the gate cannot see
    it. The location is therefore bounded by time instead, and never persisted —
    a wrong address is the one staleness here that costs something in the
    physical world.
  */

  it('reuses the location inside its own freshness window', async () => {
    vi.mocked(fetchCatalogLocation).mockResolvedValue(location)
    const { unmount } = await visit()
    unmount()

    await visit()

    expect(fetchCatalogLocation).toHaveBeenCalledTimes(1)
  })

  // Belt and braces: the stamp cannot promise anything about the location, but a
  // seller who moved their shop most likely changed something else too.
  it('re-reads the location when the stamp moves', async () => {
    vi.mocked(fetchCatalogLocation).mockResolvedValue(location)
    const { unmount } = await visit()
    unmount()
    await stampWindowElapses()
    vi.mocked(fetchCatalogUpdated).mockResolvedValue({ catalogId: CATALOG_ID, updated: STAMP_B })

    await visit()

    await waitFor(() => expect(fetchCatalogLocation).toHaveBeenCalledTimes(2))
  })

  // A failed freshness check is not evidence that anything changed.
  it('keeps serving the cache when the stamp read fails', async () => {
    const { unmount } = await visit()
    unmount()
    await stampWindowElapses()
    vi.mocked(fetchCatalogUpdated).mockRejectedValue(new Error('Red no disponible'))

    renderPage()

    expect(await screen.findByText('Tienda de Ana')).toBeInTheDocument()
    expect(fetchPublicCatalog).toHaveBeenCalledTimes(1)
    expect(fetchCatalogItems).toHaveBeenCalledTimes(1)
  })

  // The epoch is what an unknown, deleted *or* never-edited catalog answers. It
  // is a comparison token like any other, never a "not found" signal — that is
  // GET /catalog/:id's own 404.
  it('treats the epoch as an ordinary stamp, not as an error', async () => {
    vi.mocked(fetchCatalogUpdated).mockResolvedValue({
      catalogId: CATALOG_ID,
      updated: '1970-01-01T00:00:00.000Z',
    })

    const { unmount } = await visit()

    expect(screen.getByText('Tienda de Ana')).toBeInTheDocument()
    expect(screen.queryByText(/no encontrado|no existe/i)).not.toBeInTheDocument()
    unmount()
    await stampWindowElapses()

    await visit()
    await waitFor(() => expect(fetchCatalogUpdated).toHaveBeenCalledTimes(2))
    expect(fetchPublicCatalog).toHaveBeenCalledTimes(1)
  })
})
