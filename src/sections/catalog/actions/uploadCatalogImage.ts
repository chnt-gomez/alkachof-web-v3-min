import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUploadCatalogImage } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

/**
 * Uploads or replaces the catalog's presentation image. Owner-only.
 *
 * Returns the full updated catalog so the caller can sync its cached copy in one
 * step — no refetch needed. Replacing deletes the previous file server-side and
 * the new url carries a timestamp, so never append a cache-busting param.
 */
export async function uploadCatalogImage(catalogId: string, file: File): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockUploadCatalogImage(catalogId, file)
  // `api()` omits Content-Type for FormData so the browser sets the multipart
  // boundary — a hand-rolled fetch loses it and the server sees no file.
  const form = new FormData()
  form.append('image', file)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/image`, {
    method: 'POST',
    body: form,
  })
  return data.catalog
}
