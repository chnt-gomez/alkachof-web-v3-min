import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import { readLocationByCatalog } from './mockLocationStore'

export function mockFetchCatalogLocation(catalogId: string): Promise<CatalogLocation | null> {
  return Promise.resolve(readLocationByCatalog(catalogId))
}
