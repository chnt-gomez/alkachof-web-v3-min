import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export async function updateCatalog(catalogId: string, patch: Partial<Catalog>): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockUpdateCatalog(catalogId, patch)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/update`, {
    method: 'POST',
    body: patch,
  })
  return data.catalog
}
