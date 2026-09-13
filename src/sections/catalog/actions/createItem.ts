import { api } from '@/lib/api'
import type { ItemType } from '@/lib/item'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type NewItemData = {
  catalogId: string
  name: string
  description: string
  /** Price in cents. */
  price: number
  /** The image file itself — uploaded in the same multipart request. */
  image: File | null
  /**
   * Creation is the only chance to set this: the backend rejects any later
   * change. Optional on the wire (omitting it yields a product), but the form
   * always supplies it.
   */
  type: ItemType
}

export async function createItem(data: NewItemData): Promise<Item> {
  const { catalogId, image, name, description, price, type } = data
  // The endpoint is multipart: the file rides along under the `image` field and
  // the text fields sit next to it. There is no separate upload call.
  const form = new FormData()
  if (image) form.append('image', image)
  form.append('name', name)
  form.append('description', description)
  form.append('price', String(price))
  form.append('type', type)
  const result = await api<{ item: Item }>(`/catalog/${catalogId}/item/add`, {
    method: 'POST',
    body: form,
  })
  return result.item
}
