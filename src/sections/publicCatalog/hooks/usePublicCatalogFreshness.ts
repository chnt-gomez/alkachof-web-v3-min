import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchCatalogUpdated } from '../actions/fetchCatalogUpdated'

/**
 * Matches the server's `Cache-Control: max-age=30`. A shorter one cannot learn
 * anything — the browser serves it from the HTTP cache without touching the
 * network.
 */
const STAMP_STALE_MS = 30_000

/*
 * The live stamp is deliberately **not** persisted, though it is tiny and the
 * handoff offers it.
 *
 * `catalogSynced` is what a restored payload needs in order to be checkable, and
 * that one is persisted. Persisting the *live* stamp as well would restore it
 * equal to `catalogSynced` on every cold start, the gate would see no change,
 * and the server would never be asked — which is the one thing this must always
 * do. The live value has to come from the network, every cold start.
 */

/**
 * Decides whether a cached copy of someone else's shop is still good.
 *
 * The public catalog is the one cached thing this user does not write, so it
 * cannot be trusted the way the owner's own rows are. `GET /updated/:id` makes
 * "did anything change?" an ~80-byte question, which is what lets the payload be
 * cached — and persisted — at all.
 *
 * **On mount and on window focus, never on an interval.** The win is on
 * *revisit*, not on watching a shop change while you look at it, and a
 * backgrounded tab polling a shop nobody is reading is the waste this whole
 * feature exists to remove.
 *
 * One stamp covers metadata, items and questions together, so a change refetches
 * all three. That is the granularity the API offers; there are no per-item
 * stamps and asking for them is out of scope.
 */
export function usePublicCatalogFreshness(catalogId: string, hasPayload: boolean) {
  const queryClient = useQueryClient()

  const { data: stamp } = useQuery({
    queryKey: queryKeys.catalogStamp(catalogId),
    queryFn: () => fetchCatalogUpdated(catalogId),
    staleTime: STAMP_STALE_MS,
    // Both of these override the app-wide defaults, and both are load-bearing.
    // `refetchOnMount: false` would skip the check on exactly the revisit this
    // exists for — the entry would still be in memory from the last visit and
    // nothing would ever ask the server again.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // A failed freshness check is not evidence that anything changed, so there
    // is nothing to retry towards: keep serving what we have.
    retry: 0,
  })

  const live = stamp?.updated

  useEffect(() => {
    if (!live) return
    // The payload is still in flight. Whatever it returns will be at least as
    // fresh as this stamp, so there is nothing to compare yet.
    if (!hasPayload) return

    const syncedKey = queryKeys.catalogSynced(catalogId)
    const synced = queryClient.getQueryData<string>(syncedKey)

    if (synced === live) return

    // No record means the payload in the cache was fetched during this session —
    // a restored one always carries its stamp, because the two are persisted
    // together. So this is a fresh copy, and the current stamp is its baseline.
    if (synced === undefined) {
      queryClient.setQueryData(syncedKey, live)
      return
    }

    // Compared for *inequality*, never ordering. The stamp is the server's wall
    // clock; if it ever steps backward, `>` would pin us to stale data forever
    // while `!==` self-heals on the next write. We want "changed", not "newer".
    void queryClient
      .invalidateQueries({ queryKey: queryKeys.publicCatalog(catalogId) })
      .then(() => queryClient.setQueryData(syncedKey, live))

    // The location is not covered by the stamp — a location-only edit does not
    // move it, which is why `useCatalogLocation` carries a time bound of its own.
    // But when the stamp *does* move, a seller who also touched their address is
    // the likeliest reason, and re-reading it here costs one request we are
    // already making a round of. Belt and braces, not the guarantee.
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalogLocation(catalogId) })
  }, [live, hasPayload, catalogId, queryClient])
}
