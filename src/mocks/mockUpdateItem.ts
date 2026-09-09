import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { bumpAllCatalogStamps } from './mockCatalogStampStore'

export function mockUpdateItem(
  itemId: string,
  patch: Partial<Item>,
  image?: File | null,
): Promise<Item> {
  bumpAllCatalogStamps()
  const updated: Item = {
    _id: itemId,
    catalogId: patch.catalogId ?? '',
    name: 'Producto',
    description: '',
    price: 0,
    imgPath: '',
    outOfStock: false,
    updatedOn: new Date().toISOString(),
    type: 'product',
    ...patch,
  }
  if (image) updated.imgPath = URL.createObjectURL(image)
  return Promise.resolve(updated)
}
