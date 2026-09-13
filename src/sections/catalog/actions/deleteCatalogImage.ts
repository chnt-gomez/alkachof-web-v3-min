import { api } from '@/lib/api'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

/**
 * Removes the catalog's presentation image. Owner-only, and idempotent — calling
 * it on a catalog with no image also succeeds, so a double-tap needs no guard.
 * Resolves to the full updated catalog (with `image` absent).
 */
export async function deleteCatalogImage(catalogId: string): Promise<Catalog> {
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/image/delete`, {
    method: 'POST',
  })
  return data.catalog
}
