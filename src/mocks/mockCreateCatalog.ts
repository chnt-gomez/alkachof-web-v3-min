import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import type { CreateCatalogInput } from '@/sections/catalogs/actions/createCatalog'
import { randomId } from './random'
import { __mockCatalogsCache } from './mockFetchMyCatalogs'

export function mockCreateCatalog(input: CreateCatalogInput): Promise<Catalog> {
  const catalog: Catalog = {
    _id: randomId(),
    userId: 'me',
    alias: input.alias,
    welcomeText: input.welcomeText ?? '',
    description: input.description,
    payOptions: input.payOptions,
    deliveryType: input.deliveryType,
    location: input.location ?? '',
    locationZip: input.locationZip ?? '',
    deliveryDates: [],
    deliveryLocations: [],
  }
  __mockCatalogsCache().push(catalog)
  return Promise.resolve(catalog)
}
