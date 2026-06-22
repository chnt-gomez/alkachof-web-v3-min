import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateItem } from '@/mocks'
import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

export async function updateItem(itemId: string, patch: Partial<Item>): Promise<Item> {
  if (IS_DEV_STAGE) return mockUpdateItem(itemId, patch)
  const result = await api<{ item: Item }>(`/item/${itemId}/update`, {
    method: 'POST',
    body: patch,
  })
  return result.item
}
