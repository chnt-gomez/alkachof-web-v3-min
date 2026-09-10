import { api } from '@/lib/api'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

/** Catalogs from other sellers that the user bookmarked while browsing. */
export async function fetchSavedCatalogs(): Promise<Catalog[]> {
  const data = await api<{ savedCatalogs: Catalog[] }>('/catalog/saved')
  return data.savedCatalogs
}
