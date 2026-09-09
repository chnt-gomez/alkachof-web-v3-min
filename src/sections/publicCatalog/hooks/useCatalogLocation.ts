import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchCatalogLocation, type CatalogLocation } from '../actions/fetchCatalogLocation'

/**
 * How long a location may be trusted without re-reading it.
 *
 * **Bounded by time rather than by the freshness stamp, and that is not a
 * preference.** Editing a location does not move `GET /updated/:id`, so the gate
 * that makes the rest of a shop cacheable cannot see a location change at all —
 * see `followup.CatalogLocationStamp.md`. Time is the only bound available.
 *
 * Five minutes because a stale address is the one staleness on this screen with
 * a cost in the physical world: a buyer can drive to it. Long enough that
 * bouncing between the shop and the cart is free, short enough that a corrected
 * address reaches a browsing visitor in the same session.
 *
 * It is also **never persisted** (`queryPersist` allows only the `public` and
 * `synced` scopes), so the window can never span a reload. When the stamp starts
 * covering locations, this constant goes away and the key joins the gated
 * subtree.
 */
const LOCATION_STALE_MS = 5 * 60 * 1000

function hasValidCoords(loc: CatalogLocation): boolean {
  return (
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    loc.lat >= -90 &&
    loc.lat <= 90 &&
    loc.lng >= -180 &&
    loc.lng <= 180
  )
}

/**
 * The raw stored location, valid coordinates or not.
 *
 * The owner's editor needs this: a location row with unusable coordinates still
 * exists, and hiding it would make the seller create a second one instead of
 * fixing the first.
 */
export function useCatalogLocationQuery(catalogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalogLocation(catalogId ?? ''),
    queryFn: () => fetchCatalogLocation(catalogId as string),
    enabled: Boolean(catalogId),
    staleTime: LOCATION_STALE_MS,
    // Overrides the app default so the bound above can actually expire; without
    // it the entry would sit in memory unread for the life of the session.
    refetchOnMount: true,
    // A missing location is a normal state, not an error worth retrying.
    retry: 0,
  })
}

/**
 * The catalog's location, or `null` when there is none, the fetch failed, or the
 * stored coordinates are unusable. Callers use the null case to hide the map
 * affordance entirely, so a visitor never opens an empty map.
 */
export function useCatalogLocation(catalogId: string | undefined): CatalogLocation | null {
  const { data } = useCatalogLocationQuery(catalogId)
  return data && hasValidCoords(data) ? data : null
}
