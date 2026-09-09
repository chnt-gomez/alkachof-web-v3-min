import type { CatalogStamp } from '@/sections/publicCatalog/actions/fetchCatalogUpdated'
import { readCatalogStamp, touchCatalogStamp } from './mockCatalogStampStore'

export function mockFetchCatalogUpdated(catalogId: string): Promise<CatalogStamp> {
  // Registers the id so a later mutation carrying no catalog id of its own still
  // has something to bump — see `bumpAllCatalogStamps`.
  touchCatalogStamp(catalogId)
  const updated = readCatalogStamp(catalogId)
  return Promise.resolve({ catalogId, updated })
}
