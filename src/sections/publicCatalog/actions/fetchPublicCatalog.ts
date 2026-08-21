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
  /**
   * Presentation image url. Absent — not null, not '' — when the owner has not
   * uploaded one, so branch on presence and render the placeholder. Treat the
   * url as opaque; never derive it from the catalog id.
   */
  image?: string
}

export async function fetchPublicCatalog(catalogId: string): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockFetchPublicCatalog(catalogId)
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}`, {
    authenticated: false,
  })
  return data.catalog
}
