import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { mockFetchEditableCatalog } from './mockFetchEditableCatalog'
import { __mockCatalogsCache } from './mockFetchMyCatalogs'

export function mockFetchCatalog(catalogId: string): Promise<Catalog> {
  const existing = __mockCatalogsCache().find((c) => c._id === catalogId)
  if (existing) return Promise.resolve(existing)
  return mockFetchEditableCatalog(catalogId)
}
