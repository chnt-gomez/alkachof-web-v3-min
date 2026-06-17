import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

export async function fetchCatalog(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchCatalog(catalogId)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}`)
  return data.catalog
}
