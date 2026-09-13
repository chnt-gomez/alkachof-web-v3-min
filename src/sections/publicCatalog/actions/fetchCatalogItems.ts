import { api } from '@/lib/api'
import type { ItemType } from '@/lib/item'

// The type and its guard live in lib/ so non-section code (formatters, the
// cart) can reach them; re-exported here because this module is where every
// consumer already imports the item domain from.
export { isService } from '@/lib/item'
export type { ItemType }

export type Item = {
  _id: string
  name: string
  description: string
  price: number
  imgPath: string
  outOfStock: boolean
  updatedOn: string
  catalogId: string
  /**
   * Optional because an item that predates this field should read as a
   * product. The API applies the default on load so it is present in practice —
   * never branch on its absence directly, use `isService`.
   */
  type?: ItemType
}

export async function fetchCatalogItems(catalogId: string): Promise<Item[]> {
  const data = await api<{ items: Item[] }>(`/catalog/${catalogId}/items`, {
    authenticated: false,
  })
  return data.items
}
