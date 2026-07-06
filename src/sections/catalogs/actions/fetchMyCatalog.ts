import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchMyCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

/**
 * Fetches the authenticated owner's catalog. Every registered user has exactly
 * one catalog, which the backend resolves from the auth token.
 * GET /catalog responds with `{ catalog: {...} }` (a single object).
 */
export async function fetchMyCatalog(): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchMyCatalog()
  const data = await api<{ catalog: Catalog }>('/catalog')
  return data.catalog
}
