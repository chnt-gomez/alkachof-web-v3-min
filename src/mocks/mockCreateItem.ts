import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import type { NewItemData } from '@/sections/catalog/actions/createItem'
import { randomId } from './random'
import { bumpCatalogStamp } from './mockCatalogStampStore'

export function mockCreateItem(data: NewItemData): Promise<Item> {
  bumpCatalogStamp(data.catalogId)
  const { image, ...fields } = data
  const item: Item = {
    _id: `item_${randomId()}`,
    updatedOn: new Date().toISOString(),
    outOfStock: false,
    // Preview the file the user just picked instead of a stand-in photo.
    imgPath: image ? URL.createObjectURL(image) : '',
    ...fields,
  }
  return Promise.resolve(item)
}
