import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalogUpdated } from '@/mocks'

/** An opaque comparison token. The only operation on it is `!==`. */
export type CatalogStamp = { catalogId: string; updated: string }

/**
 * One timestamp that moves whenever anything a visitor can see about a catalog
 * changes — its metadata, its image, its items, and any question asked or
 * answered on it. The cheapest request in the API: one indexed lookup, ~80
 * bytes, no auth.
 *
 * **There is no error case.** An unknown catalog, a deleted one and a malformed
 * id all answer 200 with the epoch, and so does a real catalog nobody has edited
 * yet — that is the correct "nothing has happened here" value, comparable like
 * any other. Never read the epoch as "not found"; `GET /catalog/:id` owns that.
 *
 * Unauthenticated on purpose: the route ignores a token, and sending one would
 * queue this behind a refresh it does not need.
 */
export async function fetchCatalogUpdated(catalogId: string): Promise<CatalogStamp> {
  if (IS_DEV_STAGE) return mockFetchCatalogUpdated(catalogId)
  return api<CatalogStamp>(`/updated/${catalogId}`, { authenticated: false })
}
