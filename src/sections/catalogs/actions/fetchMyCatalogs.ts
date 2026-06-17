import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchMyCatalogs } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type { Catalog }

export async function fetchMyCatalogs(): Promise<Catalog[]> {
  if (IS_DEV_STAGE) return mockFetchMyCatalogs()
  const data = await api<{ catalogs: Catalog[] }>('/catalog')
  return data.catalogs
}
