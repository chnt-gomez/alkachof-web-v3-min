import { useEffect, useState, type ReactNode } from 'react'
import {
  QueryClientProvider,
  hydrate,
  type DehydratedState,
  type QueryKey,
} from '@tanstack/react-query'
import { persistQueryClientSubscribe } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { IS_DEV_STAGE } from './stage'
import { queryClient } from './queryClient'
import { queryKeys } from './queryKeys'
import { QUERY_STORAGE_KEY, clearPersistedCache } from './queryStorage'

/** Long enough to cover any realistic gap between sessions; short enough that a
 *  forgotten device does not serve week-old data. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Keys always allowed on disk. **An allowlist, never "everything that
 * succeeded".** Adding one is a decision about staleness, not a performance
 * tweak.
 *
 * - `profile` — read on the blocking boot path, so serving it from disk is what
 *   removes the full-page skeleton. Revalidated in the background on every cold
 *   start, so a profile edited on another device is wrong for one paint rather
 *   than forever.
 * - `instagram/status` — the epic's original ask, and the one endpoint here
 *   guarding a **billed** call. Deliberately *not* revalidated: its `staleTime`
 *   already expires exactly at `nextAvailable`, so an earlier refetch is a
 *   request that cannot learn anything.
 * - `subscriptions` — owner-owned, and the list that decides which shops below
 *   are allowed on disk at all. It has to survive the reload the shops do.
 *
 * The **owner's own** catalog and items are still held back. Nothing gates them:
 * a persisted list never refetches, so a product deleted on another device would
 * render here indefinitely. (Their public counterparts are a different case —
 * see below — because the freshness stamp is exactly that missing gate.)
 *
 * Never persist: Pedidos, chat or notifications (other people write those, and
 * the feeds are unbounded); the catalog's **location** (editing it does not move
 * the freshness stamp, so nothing would catch a stale one); anything derived from
 * an Instagram `mediaUrl` (the CDN links expire); `/instagram/posts` (the billed
 * feed — on disk it would make a stale feed importable); tokens (own keys).
 *
 * **Never persist the news feed either**, and it is the sharpest version of the
 * owner-catalog problem: announcements expire on a server clock nobody here can
 * see, and `deleted: true` is how an admin pulls one that should not have gone
 * out. A persisted copy would keep showing a retracted announcement across
 * sessions, to exactly the people it was pulled from. News has no `GET /updated/:id`
 * equivalent to gate it with — `followup.NewsCacheStamp.md` is the ask for one.
 */
const PERSISTED_KEYS: readonly QueryKey[] = [
  queryKeys.profile(),
  queryKeys.instagramStatus(),
  queryKeys.subscriptions(),
]

/**
 * A shop the viewer subscribes to, keyed by id — its metadata, items, questions,
 * and the stamp that copy was fetched against.
 *
 * **Scoped to subscriptions on purpose.** Persisting every shop a visitor opens
 * would grow the blob without bound and need an LRU; subscription *is* the
 * natural bound, and it is the honest definition of "a shop this person comes
 * back to". A shop glanced at once stays in memory for the session and goes away
 * with the tab.
 *
 * They are only safe on disk because `GET /updated/:id` gates them — one ~80-byte
 * read tells us whether the copy is still the shop. Persisting these payloads
 * *without* that gate would reintroduce exactly the bug the owner-catalog note
 * above describes.
 *
 * `catalogSynced` must travel with them: it records which stamp the stored copy
 * matches. A restored payload with no recorded stamp cannot be checked at all, so
 * the first change after a cold start would be missed. They land in one atomic
 * blob, so the two can never disagree.
 */
function subscribedCatalogIdOf(key: QueryKey): string | null {
  const [root, scope, catalogId] = key
  if (typeof catalogId !== 'string') return null
  if (root !== 'catalog') return null
  if (scope !== 'public' && scope !== 'synced') return null
  return catalogId
}

function subscribedIds(): ReadonlySet<string> {
  const subs = queryClient.getQueryData<Array<{ catalogId: string }>>(queryKeys.subscriptions())
  return new Set((subs ?? []).map((s) => s.catalogId))
}

function isPersistedKey(key: QueryKey): boolean {
  if (
    PERSISTED_KEYS.some(
      (allowed) => allowed.length === key.length && allowed.every((seg, i) => seg === key[i]),
    )
  ) {
    return true
  }

  const catalogId = subscribedCatalogIdOf(key)
  // Read fresh on every dehydrate rather than captured: unsubscribing drops the
  // shop from the very next write, without anything having to evict it.
  return catalogId !== null && subscribedIds().has(catalogId)
}

const dehydrateOptions = {
  shouldDehydrateQuery: (query: { state: { status: string }; queryKey: QueryKey }) =>
    query.state.status === 'success' && isPersistedKey(query.queryKey),
}

const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: QUERY_STORAGE_KEY,
  // Every cache change re-serialises the allowlisted rows and writes them. The
  // library default is 1s; 200ms still batches the burst at boot but keeps the
  // window in which a logout could be followed by a resurrecting write short.
  throttleTime: 200,
})

type PersistedBlob = { buster: string; timestamp: number; clientState: DehydratedState }

/**
 * Reads the cache back off disk **synchronously**, before anything renders.
 *
 * `PersistQueryClientProvider` would be less code, but it restores through a
 * promise: for one tick `useIsRestoring()` is true, queries are paused, and the
 * profile query reports no data. `ProtectedRoute` reads that as "not
 * authenticated". So the library's provider buys either a full-page skeleton on
 * every cold start or a bounce to /login — and removing that skeleton is the
 * entire prize of this phase. Storage here is synchronous, so restoring
 * synchronously is available and worth the few lines.
 *
 * The write half stays library-owned (`persistQueryClientSubscribe`), so
 * throttling and dehydration are not hand-rolled. What is hand-rolled is exactly
 * the two guards below, and both are directly tested.
 *
 * @returns whether anything was restored.
 */
function restoreFromDisk(): boolean {
  try {
    const raw = window.localStorage.getItem(QUERY_STORAGE_KEY)
    if (!raw) return false

    const blob = JSON.parse(raw) as PersistedBlob

    // R1 — a row dehydrated by one build must never be rehydrated by another.
    // Nothing validates the shape on the way back in, so a cached type that
    // gained a field would surface as a runtime error on the boot path.
    if (blob.buster !== __CACHE_BUSTER__) {
      clearPersistedCache()
      return false
    }

    if (!blob.timestamp || Date.now() - blob.timestamp > MAX_AGE_MS) {
      clearPersistedCache()
      return false
    }

    hydrate(queryClient, blob.clientState)
    return true
  } catch {
    // Corrupt JSON, or storage unavailable (Safari private mode). Boot cold —
    // never let a bad cache stop the app from starting.
    clearPersistedCache()
    return false
  }
}

/**
 * The app's query provider.
 *
 * **Persistence is off in dev stage, and not as a preference.** The dev-stage
 * mocks keep their state in module-level variables that reset on reload —
 * `mockInstagramStore` starts un-enrolled every time, which is the documented way
 * to replay the enrollment wizard. A persisted `/instagram/status` would survive
 * that reload and contradict the store, pinning the dev session to the cooldown
 * screen with no way out but clearing site data.
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  // A `useState` initialiser runs once, synchronously, before children render —
  // which is the whole point: the cache has to be warm by the time
  // `ProtectedRoute` first asks whether there is a session.
  const [restored] = useState(() => (IS_DEV_STAGE ? false : restoreFromDisk()))

  useEffect(() => {
    if (IS_DEV_STAGE) return

    const unsubscribe = persistQueryClientSubscribe({
      queryClient,
      persister,
      // `buster` is stamped into the blob here; `maxAge` is not a save-time
      // option — both are checked on the way back in, by `restoreFromDisk`.
      buster: __CACHE_BUSTER__,
      dehydrateOptions,
    })

    // One background revalidate per cold start, for the profile only. The
    // restored row has already painted, so this refetch blocks nothing — it buys
    // correctness without giving back the paint. The Instagram status is
    // deliberately excluded: see the allowlist note above.
    if (restored) void queryClient.invalidateQueries({ queryKey: queryKeys.profile() })

    return unsubscribe
  }, [restored])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
