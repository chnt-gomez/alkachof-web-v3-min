import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateItem } from '@/mocks'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

const BASE_URL = 'http://localhost:3001'

export async function updateItem(itemId: string, patch: Partial<Item>): Promise<Item> {
  if (IS_DEV_STAGE) return mockUpdateItem(itemId, patch)
  const res = await fetch(`${BASE_URL}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Error al guardar producto (${res.status})`)
  const data = await res.json()
  return data.item
}
