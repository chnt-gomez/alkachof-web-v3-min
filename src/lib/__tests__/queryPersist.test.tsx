import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppQueryProvider } from '../queryPersist'
import { queryClient } from '../queryClient'
import { QUERY_STORAGE_KEY } from '../queryStorage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { useAuth } from '@/sections/auth/useAuth'
import { useMyCatalog } from '@/sections/catalogs/hooks/useOwnerCatalog'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

/*
  Persistence is the one part of the cache that outlives the tab, which makes it
  both the only thing that survives a cold start and the only thing that can leak
  a session. These tests round-trip through the real persister and the real
  localStorage rather than hand-building a blob — the dehydrated shape is the
  library's, and a fixture of it would drift silently.

  They share the module-scope `queryClient`, because that is what `AppQueryProvider`
  uses; `beforeEach` empties both halves.
*/

vi.mock('@/sections/auth/actions/fetchProfile')
vi.mock('@/sections/catalogs/actions/fetchMyCatalog')

import { fetchProfile } from '@/sections/auth/actions/fetchProfile'
import { fetchMyCatalog } from '@/sections/catalogs/actions/fetchMyCatalog'

const mockCatalog: Catalog = {
  _id: 'cat1',
  userId: 'me',
  alias: 'Tienda de Ana',
  welcomeText: '',
  description: '',
  payOptions: [],
  deliveryType: [],
  location: '',
  locationZip: '',
  deliveryDates: [],
  deliveryLocations: [],
}

function Probe() {
  const { profile, isBooting, logout } = useAuth()
  // Not allowlisted — here to prove it stays out of the blob.
  const catalog = useMyCatalog(Boolean(profile))

  if (isBooting) return <p>Cargando sesión…</p>
  return (
    <div>
      <p>Perfil: {profile?.alias ?? 'ninguno'}</p>
      <p>Catálogo: {catalog.data?.alias ?? 'ninguno'}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}

function renderApp() {
  return render(
    <AppQueryProvider>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </AppQueryProvider>,
  )
}

/** The blob as the persister wrote it, or null. */
function readBlob(): { buster: string; timestamp: number; clientState: unknown } | null {
  const raw = localStorage.getItem(QUERY_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

function writeBlob(blob: unknown) {
  localStorage.setItem(QUERY_STORAGE_KEY, JSON.stringify(blob))
}

/** Renders, waits for the profile, and waits for the throttled write to land. */
async function bootAndPersist() {
  const view = renderApp()
  await screen.findByText('Perfil: Ana')
  await waitFor(() => expect(readBlob()).not.toBeNull())
  return view
}

/**
 * A cold start: the tab is gone (so the persister has unsubscribed) and the
 * in-memory cache with it, but the disk survives. Unmount *before* clearing —
 * clearing while mounted would persist the empty cache over the blob.
 */
function coldStart(unmount: () => void) {
  unmount()
  queryClient.clear()
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  queryClient.clear()
  localStorage.setItem('alk.token', 'token-user1')
  vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Ana' })
  vi.mocked(fetchMyCatalog).mockResolvedValue(mockCatalog)
})

describe('query persistence', () => {
  /* --- The allowlist ----------------------------------------------------- */

  it('writes only allowlisted keys to disk', async () => {
    await bootAndPersist()
    await screen.findByText('Catálogo: Tienda de Ana')

    const serialised = JSON.stringify(readBlob())
    expect(serialised).toContain('profile')
    // The catalog is cached in memory and deliberately not on disk: a persisted
    // list never refetches, so a row deleted elsewhere would render forever.
    expect(serialised).not.toContain('Tienda de Ana')
  })

  /* --- The prize: a cold start that paints from disk ---------------------- */

  it('serves the profile from disk on a cold start', async () => {
    const { unmount } = await bootAndPersist()
    coldStart(unmount)
    expect(fetchProfile).toHaveBeenCalledTimes(1)

    renderApp()

    // Synchronously — nothing awaited. Restore happens before the first render,
    // so the profile is on screen on the very first tick. `findByText` here would
    // pass just as well on a cold fetch and prove nothing.
    expect(screen.getByText('Perfil: Ana')).toBeInTheDocument()
  })

  // R6, and the reason restore is synchronous rather than the library's promise:
  // a restore that resolves a tick late leaves the profile query with no data,
  // which `ProtectedRoute` reads as "not authenticated" — a signed-in user bounced
  // to /login on every cold start.
  it('never shows the booting state when a profile is restored', async () => {
    const { unmount } = await bootAndPersist()
    coldStart(unmount)

    renderApp()

    expect(screen.queryByText('Cargando sesión…')).not.toBeInTheDocument()
    expect(await screen.findByText('Perfil: Ana')).toBeInTheDocument()
  })

  // §3: the profile is persist-*and-revalidate*. The restored row paints first, so
  // the refetch blocks nothing — it just keeps a profile edited elsewhere from
  // being wrong forever.
  it('revalidates the restored profile in the background', async () => {
    const { unmount } = await bootAndPersist()
    coldStart(unmount)
    vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Beto' })

    renderApp()

    expect(await screen.findByText('Perfil: Beto')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(2)
  })

  /* --- R1: the rehydration trap ------------------------------------------ */

  /*
    A row dehydrated by one build must never be rehydrated by another; the buster
    is derived from the build so this cannot be forgotten.

    Both of these discriminate on *content*, not on how many times the action ran.
    A discarded blob and an accepted-then-revalidated one both fetch exactly once
    more, so a call count cannot tell them apart — an earlier version of these
    tests passed with the guard deleted.
  */

  it('discards the blob when the build changed', async () => {
    const { unmount } = await bootAndPersist()
    const blob = readBlob()!
    coldStart(unmount)
    writeBlob({ ...blob, buster: 'a-different-build' })
    // Distinct from what the blob holds, so a rehydration is visible.
    vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Fresco' })

    renderApp()

    // Restore is synchronous: had the blob been accepted, the stale row would be
    // on screen on this very tick.
    expect(screen.queryByText('Perfil: Ana')).not.toBeInTheDocument()
    expect(await screen.findByText('Perfil: Fresco')).toBeInTheDocument()
  })

  it('discards a blob older than maxAge', async () => {
    const { unmount } = await bootAndPersist()
    const blob = readBlob()!
    coldStart(unmount)
    writeBlob({ ...blob, timestamp: Date.now() - 25 * 60 * 60 * 1000 })
    vi.mocked(fetchProfile).mockResolvedValue({ _id: 'p1', userId: 'user1', alias: 'Fresco' })

    renderApp()

    expect(screen.queryByText('Perfil: Ana')).not.toBeInTheDocument()
    expect(await screen.findByText('Perfil: Fresco')).toBeInTheDocument()
  })

  /* --- R4 / D7: the session boundary ------------------------------------- */

  it('removes the blob on logout', async () => {
    const user = userEvent.setup()
    await bootAndPersist()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await screen.findByText('Perfil: ninguno')
    // Not just emptied — gone. And it must stay gone: a throttled write could
    // otherwise land after the logout and put the rows back.
    await waitFor(() => expect(localStorage.getItem(QUERY_STORAGE_KEY)).toBeNull())
    await new Promise((r) => setTimeout(r, 350))
    expect(JSON.stringify(readBlob())).not.toContain('Ana')
  })

  /* --- Subscription-scoped shops ----------------------------------------- */

  /*
    Someone else's shop persists only while the viewer subscribes to it.
    Subscription is the natural bound on the blob — persisting every shop a
    visitor opens would grow it without limit and need an LRU — and it is the
    honest definition of "a shop this person comes back to".
  */
  describe('subscribed shops', () => {
    const SHOP = 'shop1'
    const OTHER = 'shop2'

    /** Seeds a shop's payload and the stamp that copy matches. */
    function seedShop(catalogId: string) {
      queryClient.setQueryData(['catalog', 'public', catalogId], { _id: catalogId, alias: 'Ana' })
      queryClient.setQueryData(['catalog', 'public', catalogId, 'items'], [])
      queryClient.setQueryData(['catalog', 'synced', catalogId], '2026-09-08T14:22:31.004Z')
      // The *live* stamp — read from the server, never persisted.
      queryClient.setQueryData(['catalog', 'stamp', catalogId], {
        catalogId,
        updated: '2026-09-08T14:22:31.004Z',
      })
    }

    function subscribeTo(...catalogIds: string[]) {
      queryClient.setQueryData(
        ['subscriptions'],
        catalogIds.map((catalogId) => ({ _id: `s-${catalogId}`, userId: 'user1', catalogId })),
      )
    }

    it('persists a subscribed shop with the stamp its copy matches', async () => {
      await bootAndPersist()
      subscribeTo(SHOP)
      seedShop(SHOP)

      await waitFor(() => expect(JSON.stringify(readBlob())).toContain('"synced"'))
      const serialised = JSON.stringify(readBlob())
      expect(serialised).toContain(SHOP)
      // Rule 2: the payload and the stamp it was fetched against travel together,
      // in one atomic blob. A restored payload with no recorded stamp could not
      // be checked at all, and the first change after a reload would be missed.
      expect(serialised).toContain('2026-09-08T14:22:31.004Z')
    })

    it('does not persist a shop the viewer only visited', async () => {
      await bootAndPersist()
      subscribeTo(SHOP)
      seedShop(SHOP)
      seedShop(OTHER)

      await waitFor(() => expect(JSON.stringify(readBlob())).toContain(SHOP))
      expect(JSON.stringify(readBlob())).not.toContain(OTHER)
    })

    it('drops a shop from disk when the viewer unsubscribes', async () => {
      await bootAndPersist()
      subscribeTo(SHOP)
      seedShop(SHOP)
      await waitFor(() => expect(JSON.stringify(readBlob())).toContain(SHOP))

      // The allowlist reads the subscription list fresh on every write, so this
      // alone is enough — nothing has to evict the shop.
      subscribeTo()

      await waitFor(() => expect(JSON.stringify(readBlob())).not.toContain(SHOP))
    })

    // The stamp does not move when a location is edited, so a persisted location
    // would go stale across reloads with nothing able to catch it. Bounded by
    // time in memory; never on disk.
    it('never persists a catalog location', async () => {
      await bootAndPersist()
      subscribeTo(SHOP)
      seedShop(SHOP)
      queryClient.setQueryData(['catalog', 'location', SHOP], {
        _id: 'loc1',
        street_name: 'Macedonio Alcalá',
        catalogId: SHOP,
      })

      await waitFor(() => expect(JSON.stringify(readBlob())).toContain(SHOP))
      expect(JSON.stringify(readBlob())).not.toContain('Macedonio')
    })

    // The *live* stamp must come from the network on every cold start. Restored,
    // it would equal the recorded one, the gate would see no change, and the
    // server would never be asked — which is the one thing this must always do.
    it('never persists the live freshness stamp', async () => {
      await bootAndPersist()
      subscribeTo(SHOP)
      seedShop(SHOP)

      await waitFor(() => expect(JSON.stringify(readBlob())).toContain(SHOP))
      expect(JSON.stringify(readBlob())).not.toContain('"stamp"')
    })
  })

  /* --- R2 / D8: the cross-tab hole --------------------------------------- */

  // Another tab logged out. This one still holds the previous user's rows in
  // memory and would re-persist them on its next cache write.
  it('ends the session when another tab clears the token', async () => {
    await bootAndPersist()

    act(() => {
      localStorage.removeItem('alk.token')
      window.dispatchEvent(new StorageEvent('storage', { key: 'alk.token', newValue: null }))
    })

    expect(await screen.findByText('Perfil: ninguno')).toBeInTheDocument()
    await waitFor(() => expect(JSON.stringify(readBlob())).not.toContain('Ana'))
  })
})
