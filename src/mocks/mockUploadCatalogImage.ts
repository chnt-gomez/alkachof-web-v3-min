import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { writeCatalogImage } from './mockCatalogImageStore'
import { bumpCatalogStamp } from './mockCatalogStampStore'

export function mockUploadCatalogImage(catalogId: string, file: File): Promise<Catalog> {
  bumpCatalogStamp(catalogId)
  return Promise.resolve(writeCatalogImage(catalogId, URL.createObjectURL(file)))
}
