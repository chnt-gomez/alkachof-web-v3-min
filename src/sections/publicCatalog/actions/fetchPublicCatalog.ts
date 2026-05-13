const BASE_URL = 'http://localhost:3001'

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
  const res = await fetch(`${BASE_URL}/catalog/${catalogId}`)
  if (!res.ok) throw new Error(`Catalog not found (${res.status})`)
  const data = await res.json()
  return data.catalog
}
