import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { writeCatalogImage } from './mockCatalogImageStore'

export function mockDeleteCatalogImage(catalogId: string): Promise<Catalog> {
  return Promise.resolve(writeCatalogImage(catalogId, undefined))
}
