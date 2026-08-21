import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { writeCatalogImage } from './mockCatalogImageStore'

export function mockUploadCatalogImage(catalogId: string, file: File): Promise<Catalog> {
  return Promise.resolve(writeCatalogImage(catalogId, URL.createObjectURL(file)))
}
