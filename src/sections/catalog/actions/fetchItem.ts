import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchItem } from '@/mocks'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

export async function fetchItem(itemId: string): Promise<Item> {
  if (IS_DEV_STAGE) return mockFetchItem(itemId)
  const data = await api<{ item: Item }>(`/item/${itemId}`)
  return data.item
}
