import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchCatalogItems } from '@/mocks'

const BASE_URL = 'http://localhost:3001'

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
  const res = await fetch(`${BASE_URL}/catalog/${catalogId}/items`)
  if (!res.ok) throw new Error(`Could not load items (${res.status})`)
  const data = await res.json()
  return data.items
}
