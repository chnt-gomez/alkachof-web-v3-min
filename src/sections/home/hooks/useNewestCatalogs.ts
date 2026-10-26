import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchNewestCatalogs, fetchNewestUpdated } from '../actions/fetchNewestCatalogs'

/**
 * Matches the server's `Cache-Control: max-age=30`. A shorter one cannot learn
 * anything — the browser serves it from the HTTP cache without touching the
 * network.
 */
const STAMP_STALE_MS = 30_000

/**
 * How long the showcase may be trusted without re-reading it.
 *
 * The stamp below does the real work: it catches an **addition** on the next
 * mount or focus. This is the backstop for the one thing it cannot see. The
 * stamp is the newest row's `createdOn`, and a removal cannot move a maximum
 * forward — so when a shop leaves the showcase (its owner banned, its catalog
 * deleted) the stamp does not move, and a client holding a persisted copy would
 * keep drawing that card until the next shop is added.
 *
 * Same remedy and the same reasoning as `LOCATION_STALE_MS` in
 * `useCatalogLocation`, which carries a time bound precisely because a location
 * edit does not move the catalog's stamp either. An hour is generous: the list
 * changes a few times a day at most, and a shorter value buys nothing but
 * requests against a budget the list shares with the whole app.
 *
 * Unlike that one, this query **is** persisted, so the window survives a reload
 * on its own — React Query dehydrates `dataUpdatedAt` with the row. Never
 * hand-roll a `fetchedAt` field.
 */
const NEWEST_MAX_AGE_MS = 60 * 60 * 1000

/** The showcase payload. Internal: every caller goes through the gate below, so
 *  nothing can read these rows without the check that keeps them honest. */
function useNewestCatalogsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.newestCatalogs(),
    queryFn: fetchNewestCatalogs,
    enabled,
    staleTime: NEWEST_MAX_AGE_MS,
    // Overrides the app default so the bound above can actually expire; without
    // it the entry would sit in memory unread for the life of the session.
    refetchOnMount: true,
    // There is no error case on this route, so the only failure is a network
    // one — and a retry here races the skeleton on a tab the user is already
    // reading. The stamp will ask again on the next focus.
    retry: 0,
  })
}

/**
 * The 25 newest catalogs, and the gate that decides whether the cached copy is
 * still the showcase.
 *
 * This list is not owned by this user, so it cannot take the defaults in
 * `queryClient.ts` — those are written for rows that change only through
 * mutations this client performs. It is the same position the public catalog is
 * in, and the same answer: a ~60-byte `GET /newest/updated` makes "did anything
 * change?" cheap enough to ask, which is what lets the list be cached and
 * persisted at all. See `usePublicCatalogFreshness`, which this mirrors.
 *
 * **On mount and on window focus, never on an interval.** A backgrounded tab
 * polling a list nobody is reading is the waste this feature removes. A
 * live-updating "new shops" ticker is a product decision with a cost, not a
 * default.
 *
 * `enabled` is Home's `opened.comprar`: a user who never opens the buy tab
 * spends neither request.
 */
export function useNewestCatalogs(enabled = true) {
  const queryClient = useQueryClient()
  const list = useNewestCatalogsQuery(enabled)

  const { data: stamp } = useQuery({
    queryKey: queryKeys.newestStamp(),
    queryFn: fetchNewestUpdated,
    enabled,
    staleTime: STAMP_STALE_MS,
    // Both override the app-wide defaults, and both are load-bearing: with
    // `refetchOnMount: false` the check would be skipped on exactly the revisit
    // it exists for — the entry would still be in memory from the last visit
    // and nothing would ever ask the server again.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // A failed freshness check is not evidence that anything changed, so there
    // is nothing to retry towards: keep serving what we have.
    retry: 0,
  })

  const live = stamp?.updated
  // The baseline is a field of the payload, not a second cache entry: `GET
  // /newest` returns the stamp its rows were built from. A restored copy
  // therefore carries its own baseline, which is what `catalogSynced` has to
  // exist for on the public-catalog side.
  const held = list.data?.updated

  useEffect(() => {
    if (!live || !held) return

    // Compared for *inequality*, never ordering. The stamp is the server's wall
    // clock; if it ever steps backward, `>` would pin us to stale data forever
    // while `!==` self-heals on the next write. We want "changed", not "newer".
    if (live === held) return

    // One refetch per distinct stamp value. The list and the stamp are computed
    // independently, so if they ever disagree permanently — a row the list
    // filters out but the stamp was taken from — an unguarded gate would ask
    // again on every mount and every focus, forever. A `useRef` would not hold
    // this: Home remounts on every visit to "/".
    if (queryClient.getQueryData<string>(queryKeys.newestChecked()) === live) return
    queryClient.setQueryData(queryKeys.newestChecked(), live)

    // `exact`, because the stamp and this guard are nested under the same root
    // for readability and a prefix match would refetch the stamp as well — one
    // wasted request per change, forever. There is a single payload here, so
    // there is no subtree to invalidate.
    void queryClient.refetchQueries({ queryKey: queryKeys.newestCatalogs(), exact: true })
  }, [live, held, queryClient])

  return list
}
