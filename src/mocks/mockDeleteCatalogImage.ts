import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { writeCatalogImage } from './mockCatalogImageStore'
import { bumpCatalogStamp } from './mockCatalogStampStore'

export function mockDeleteCatalogImage(catalogId: string): Promise<Catalog> {
  bumpCatalogStamp(catalogId)
  return Promise.resolve(writeCatalogImage(catalogId, undefined))
}
