import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateItem } from '@/mocks'
import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type NewItemData = Omit<Item, '_id' | 'updatedOn'>

export async function createItem(data: NewItemData): Promise<Item> {
  if (IS_DEV_STAGE) return mockCreateItem(data)
  const { catalogId, ...payload } = data
  const result = await api<{ item: Item }>(`/catalog/${catalogId}/item/add`, {
    method: 'POST',
    body: payload,
  })
  return result.item
}
