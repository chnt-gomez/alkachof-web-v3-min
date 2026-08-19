import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateItem } from '@/mocks'
import { api } from '@/lib/api'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type NewItemData = {
  catalogId: string
  name: string
  description: string
  /** Price in cents. */
  price: number
  /** The image file itself — uploaded in the same multipart request. */
  image: File | null
}

export async function createItem(data: NewItemData): Promise<Item> {
  if (IS_DEV_STAGE) return mockCreateItem(data)
  const { catalogId, image, name, description, price } = data
  // The endpoint is multipart: the file rides along under the `image` field and
  // the text fields sit next to it. There is no separate upload call.
  const form = new FormData()
  if (image) form.append('image', image)
  form.append('name', name)
  form.append('description', description)
  form.append('price', String(price))
  const result = await api<{ item: Item }>(`/catalog/${catalogId}/item/add`, {
    method: 'POST',
    body: form,
  })
  return result.item
}
