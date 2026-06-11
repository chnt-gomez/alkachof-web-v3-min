import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateItem } from '@/mocks'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

const BASE_URL = 'http://localhost:3001'

export type NewItemData = Omit<Item, '_id' | 'updatedOn'>

export async function createItem(data: NewItemData): Promise<Item> {
  if (IS_DEV_STAGE) return mockCreateItem(data)
  const res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Error al crear producto (${res.status})`)
  const result = await res.json()
  return result.item
}
