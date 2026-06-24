import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchPublicCatalog } from '@/mocks'

export type Catalog = {
  _id: string
  userId: string
  alias: string
  welcomeText: string
  description: string
  payOptions: Array<'cash' | 'credit' | 'transfer' | 'other'>
  deliveryType: Array<'location-pickup' | 'delivery' | 'shipping'>
  location: string
  locationZip: string
  deliveryDates: string[]
  deliveryLocations: object[]
}

export async function fetchPublicCatalog(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchPublicCatalog(catalogId)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}`, {
    authenticated: false,
  })
  return data.catalog
}
