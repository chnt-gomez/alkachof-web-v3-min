import { api } from '@/lib/api'

/** One shop in the newest-catalogs showcase. */
export type NewestCatalogRow = {
  catalogId: string
  /**
   * The shop's name. **Can be `''`** — a catalog enters the showcase when its
   * owner verifies their phone, which is before they have necessarily named it.
   * Render it through `publicCatalogName`, never raw.
   */
  alias: string
  /**
   * Absolute url, minted by the API. **Can be absent** for the same reason the
   * alias can be blank. Pass it through `resolveMediaUrl`.
   */
  image?: string
  /** When this shop entered the showcase. ISO-8601. */
  createdOn: string
}

export type NewestCatalogs = {
  catalogs: NewestCatalogRow[]
  /**
   * The stamp these rows were built from, and the baseline the freshness gate
   * compares against — which is why this payload needs no companion "synced"
   * cache entry the way the public catalog does. The only operation on it is
   * `!==`; see `useNewestCatalogs`.
   */
  updated: string
}

export type NewestStamp = { updated: string }

/**
 * The 25 newest catalogs on the platform, newest first.
 *
 * **Unauthenticated on purpose**: the route ignores a token, and sending one
 * would queue this behind a `/refresh` it does not need.
 *
 * The row carries everything a card shows — name, image, age — so there is no
 * follow-up read per catalog. Fanning out `GET /catalog/:id` 25 times would
 * spend the global rate budget on data already in hand, and none of those calls
 * would be covered by the freshness gate.
 *
 * There is no error case. An empty showcase answers `200` with the epoch as its
 * stamp; that is an ordinary comparison token, never "not found".
 */
export async function fetchNewestCatalogs(): Promise<NewestCatalogs> {
  return api<NewestCatalogs>('/newest', { authenticated: false })
}

/**
 * "Did the showcase change?" — ~60 bytes, no auth, and exempt from the rate
 * limit the list itself is counted by. This is what makes a list this client
 * does not own cacheable at all.
 */
export async function fetchNewestUpdated(): Promise<NewestStamp> {
  return api<NewestStamp>('/newest/updated', { authenticated: false })
}
