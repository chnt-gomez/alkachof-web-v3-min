import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

export async function fetchItem(itemId: string): Promise<Item> {
  const data = await api<{ item: Item }>(`/item/${itemId}`)
  return data.item
}
