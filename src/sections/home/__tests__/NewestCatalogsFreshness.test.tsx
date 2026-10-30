import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setTokens } from '@/lib/auth'
import { HomePage } from '../HomePage'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NotificationsProvider } from '@/sections/notifications/context/NotificationsContext'
import { createTestQueryClient } from '@/test/renderWithProviders'

/*
  The showcase's freshness gate. The 25 newest shops belong to nobody here, so a
  cached copy cannot be trusted the way the seller's own rows are —
  `GET /newest/updated` is what makes it cacheable at all: one ~60-byte read
  decides whether the list we hold is still the list.

  Every assertion is on how many times an *action* ran. That is the only thing
  this feature is about.

  Two rules get their own cases because nothing else in the app would catch them
  breaking: the baseline comes from the payload's own `updated` (so a first open
  never pays twice), and the gate refetches **once per distinct stamp**, which is
  what keeps a permanent disagreement between the two endpoints from spinning.
*/

vi.mock('@/sections/catalogs/actions/fetchMyCatalog')
vi.mock('@/sections/catalog/actions/fetchCatalogItems')
vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('@/sections/notifications/liveSocket')
vi.mock('@/sections/notifications/actions/fetchNotifications', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/sections/notifications/actions/fetchNotifications')
  >()),
  fetchNotifications: vi.fn(),
  fetchAllNotifications: vi.fn(),
  markNotificationSeen: vi.fn(),
}))
vi.mock('../actions/fetchSavedCatalogs')
vi.mock('../actions/fetchNews')
vi.mock('../actions/fetchNewestCatalogs')

import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { fetchNotifications } from '@/sections/notifications/actions/fetchNotifications'
import { fetchSavedCatalogs } from '../actions/fetchSavedCatalogs'
import { fetchNews } from '../actions/fetchNews'
import { fetchNewestCatalogs, fetchNewestUpdated } from '../actions/fetchNewestCatalogs'
import type { NewestCatalogRow } from '../actions/fetchNewestCatalogs'

const STAMP_A = '2026-10-26T14:22:31.004Z'
const STAMP_B = '2026-10-27T09:00:00.000Z'

const row: NewestCatalogRow = {
  catalogId: 'new1',
  alias: 'Pan de Ana',
  image: 'https://cdn.test/pan.webp',
  createdOn: STAMP_A,
}

/** The list as the server would answer it, carrying the stamp it was built from. */
function listAt(updated: string) {
  return { catalogs: [row], updated }
}

/** One client across renders, so a "revisit" sees what the first visit cached. */
const client = createTestQueryClient()

function renderHome() {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <MemoryRouter initialEntries={['/?tab=comprar']}>
              <Routes>
                <Route path="/" element={<HomePage />} />
              </Routes>
            </MemoryRouter>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

/** Opens Home on Comprar, waits for the rows, and lets the gate settle. */
async function visit() {
  const view = renderHome()
  await screen.findByText('Pan de Ana')
  await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalled())
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
  return client.invalidateQueries({ queryKey: ['newest', 'stamp'] })
}

beforeEach(() => {
  vi.clearAllMocks()
  client.clear()
  setTokens('test-token', 'test-refresh')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'me', alias: 'Yo' })
  vi.mocked(fetchNotifications).mockResolvedValue([])
  vi.mocked(fetchNews).mockResolvedValue([])
  vi.mocked(fetchSavedCatalogs).mockResolvedValue([])
  vi.mocked(fetchNewestCatalogs).mockResolvedValue(listAt(STAMP_A))
  vi.mocked(fetchNewestUpdated).mockResolvedValue({ updated: STAMP_A })
})

afterEach(() => {
  localStorage.clear()
})

describe('newest catalogs freshness', () => {
  // The first open must not pay twice. The payload carries the stamp it was
  // built from, so that value *is* its baseline — there is nothing to infer and
  // nothing that looks like a change needing a second read.
  it('adopts the payload stamp on a first open without refetching', async () => {
    const { unmount } = await visit()

    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(1)
    expect(fetchNewestUpdated).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('costs nothing on a revisit inside the freshness window', async () => {
    const { unmount } = await visit()
    unmount()

    await visit()

    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(1)
    expect(fetchNewestUpdated).toHaveBeenCalledTimes(1)
  })

  // The cheap question is asked again; the expensive answer is not.
  it('re-reads only the stamp when the showcase has not changed', async () => {
    await visit()

    await stampWindowElapses()
    await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalledTimes(2))

    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(1)
  })

  it('refetches the list once when the stamp moves', async () => {
    await visit()

    vi.mocked(fetchNewestUpdated).mockResolvedValue({ updated: STAMP_B })
    vi.mocked(fetchNewestCatalogs).mockResolvedValue(listAt(STAMP_B))
    await stampWindowElapses()

    await waitFor(() => expect(fetchNewestCatalogs).toHaveBeenCalledTimes(2))

    // And the new payload is its own baseline: nothing fires again.
    await stampWindowElapses()
    await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalledTimes(3))
    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(2)
  })

  /*
    The list and the stamp are computed independently, so they can disagree for
    good: the stamp is the newest row's `createdOn`, and if that row is one the
    list filters out, no refetch will ever reconcile them. Unguarded, the gate
    would ask again on every stamp read and every remount, forever.
  */
  it('asks once for a stamp the list cannot reconcile, even across a remount', async () => {
    vi.mocked(fetchNewestUpdated).mockResolvedValue({ updated: STAMP_B })
    const { unmount } = await visit()

    await waitFor(() => expect(fetchNewestCatalogs).toHaveBeenCalledTimes(2))

    await stampWindowElapses()
    await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalledTimes(2))
    unmount()

    await visit()
    await stampWindowElapses()
    await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalledTimes(3))

    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(2)
  })

  // A failed freshness check is not evidence that anything changed.
  it('keeps serving the cached list when the stamp read fails', async () => {
    await visit()

    vi.mocked(fetchNewestUpdated).mockRejectedValue(new Error('offline'))
    await stampWindowElapses()
    await waitFor(() => expect(fetchNewestUpdated).toHaveBeenCalledTimes(2))

    expect(screen.getByText('Pan de Ana')).toBeInTheDocument()
    expect(fetchNewestCatalogs).toHaveBeenCalledTimes(1)
  })
})
