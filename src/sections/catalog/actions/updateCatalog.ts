import { api } from '@/lib/api'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export async function updateCatalog(catalogId: string, patch: Partial<Catalog>): Promise<Catalog> {
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}/update`, {
    method: 'POST',
    body: patch,
  })
  return data.catalog
}
