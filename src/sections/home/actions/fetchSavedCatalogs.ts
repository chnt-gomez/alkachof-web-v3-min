import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchSavedCatalogs } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

/** Catalogs from other sellers that the user bookmarked while browsing. */
export async function fetchSavedCatalogs(): Promise<Catalog[]> {
  if (IS_DEV_STAGE) return mockFetchSavedCatalogs()
  const data = await api<{ catalogs: Catalog[] }>('/catalogs/saved')
  return data.catalogs
}
