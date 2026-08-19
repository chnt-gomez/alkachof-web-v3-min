import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export function mockUpdateItem(
  itemId: string,
  patch: Partial<Item>,
  image?: File | null,
): Promise<Item> {
  const updated: Item = {
    _id: itemId,
    catalogId: patch.catalogId ?? '',
    name: 'Producto',
    description: '',
    price: 0,
    imgPath: '',
    outOfStock: false,
    updatedOn: new Date().toISOString(),
    ...patch,
  }
  if (image) updated.imgPath = URL.createObjectURL(image)
  return Promise.resolve(updated)
}
