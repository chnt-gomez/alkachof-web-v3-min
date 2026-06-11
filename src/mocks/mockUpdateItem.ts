import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export function mockUpdateItem(itemId: string, patch: Partial<Item>): Promise<Item> {
  const updated: Item = {
    _id: itemId,
    catalogId: patch.catalogId ?? '',
    name: 'Producto',
    description: '',
    price: 0,
    stock: 0,
    imgPath: '',
    sizes: [],
    updatedOn: new Date().toISOString(),
    ...patch,
  }
  return Promise.resolve(updated)
}
