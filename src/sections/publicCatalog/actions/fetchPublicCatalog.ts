import { api } from '@/lib/api'

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
  /**
   * Public url of the catalog's permanent QR code (1024x1024 PNG), encoding
   * `/join?catalogId=<id>`. Absent until the backend mints it — normally a
   * transient one-refresh gap right after creation, but not guaranteed, so
   * guard on presence rather than assuming it's always there.
   */
  qr?: string
}

export async function fetchPublicCatalog(catalogId: string): Promise<Catalog> {
  const data = await api<{ catalog: Catalog }>(`/catalog/${catalogId}`, {
    authenticated: false,
  })
  return data.catalog
}
