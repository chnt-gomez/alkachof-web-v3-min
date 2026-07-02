import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { NewItemData } from '@/sections/catalog/actions/createItem'
import { randomId } from './random'

export function mockCreateItem(data: NewItemData): Promise<Item> {
  const item: Item = {
    _id: `item_${randomId()}`,
    updatedOn: new Date().toISOString(),
    ...data,
  }
  return Promise.resolve(item)
}
