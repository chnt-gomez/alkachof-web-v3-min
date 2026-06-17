import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateCatalog } from '@/mocks'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

export type PayOption = Catalog['payOptions'][number]
export type DeliveryType = Catalog['deliveryType'][number]

export type CreateCatalogInput = {
  alias: string
  description: string
  welcomeText?: string
  payOptions: PayOption[]
  deliveryType: DeliveryType[]
  location?: string
  locationZip?: string
}

export async function createCatalog(input: CreateCatalogInput): Promise<Catalog> {
  if (IS_DEV_STAGE) return mockCreateCatalog(input)
  const data = await api<{ catalog: Catalog }>('/catalog/new', {
    method: 'POST',
    body: input,
  })
  return data.catalog
}
