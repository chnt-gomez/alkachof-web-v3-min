import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateItem } from '@/mocks'
import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type { Item }

/**
 * Updates an item. When `image` is given the request goes out as multipart so
 * the file travels under the `image` field; otherwise it stays JSON and the
 * backend keeps the item's current image.
 */
export async function updateItem(
  itemId: string,
  patch: Partial<Item>,
  image?: File | null,
): Promise<Item> {
  if (IS_DEV_STAGE) return mockUpdateItem(itemId, patch, image)
  const path = `/item/${itemId}/update`
  // An item's type is immutable — the backend answers 400 to any update that
  // changes it. Callers hand over the whole form payload, so drop the field
  // here rather than trusting every call site to remember; nothing legitimate
  // ever needs to update it.
  const safePatch = { ...patch }
  delete safePatch.type
  if (image) {
    const form = new FormData()
    form.append('image', image)
    for (const [key, value] of Object.entries(safePatch)) {
      if (value !== undefined) form.append(key, String(value))
    }
    const result = await api<{ item: Item }>(path, { method: 'POST', body: form })
    return result.item
  }
  const result = await api<{ item: Item }>(path, { method: 'POST', body: safePatch })
  return result.item
}
