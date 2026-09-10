import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

export async function fetchCatalogItems(catalogId: string): Promise<Item[]> {
  const data = await api<{ items: Item[] }>(`/catalog/${catalogId}/items`)
  return data.items
}
