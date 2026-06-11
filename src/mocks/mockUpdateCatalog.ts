import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export function mockUpdateCatalog(catalogId: string, patch: Partial<Catalog>): Promise<Catalog> {
  const updated: Catalog = {
    _id: catalogId,
    userId: 'user_mock',
    alias: 'Mi Tienda',
    welcomeText: '',
    description: '',
    payOptions: [],
    deliveryType: [],
    location: '',
    locationZip: '',
    deliveryDates: [],
    deliveryLocations: [],
    ...patch,
  }
  return Promise.resolve(updated)
}
