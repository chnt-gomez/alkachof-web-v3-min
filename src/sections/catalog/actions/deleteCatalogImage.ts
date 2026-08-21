import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockDeleteCatalogImage } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

/**
 * Removes the catalog's presentation image. Owner-only, and idempotent — calling
 * it on a catalog with no image also succeeds, so a double-tap needs no guard.
 * Resolves to the full updated catalog (with `image` absent).
 */
export async function deleteCatalogImage(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockDeleteCatalogImage(catalogId)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/image/delete`, {
    method: 'POST',
  })
  return data.catalog
}
