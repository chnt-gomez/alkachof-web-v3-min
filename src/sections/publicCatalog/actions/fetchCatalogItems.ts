import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalogItems } from '@/mocks'

export type Item = {
  _id: string
  name: string
  description: string
  price: number
  stock: number
  imgPath: string
  sizes: string[]
  updatedOn: string
  catalogId: string
}

export async function fetchCatalogItems(catalogId: string): Promise<Item[]> {
  if (IS_DEV_STAGE) return mockFetchCatalogItems(catalogId)
  const data = await api<{ items: Item[] }>(`/catalog/${catalogId}/items`, {
    authenticated: false,
  })
  return data.items
}
