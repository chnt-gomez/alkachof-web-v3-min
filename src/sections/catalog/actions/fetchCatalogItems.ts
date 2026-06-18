import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalogItems } from '@/mocks'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

export async function fetchCatalogItems(catalogId: string): Promise<Item[]> {
  if (IS_DEV_STAGE) return mockFetchCatalogItems(catalogId)
  const data = await api<{ items: Item[] }>(`/catalog/${catalogId}/items`)
  return data.items
}
