import { bumpAllCatalogStamps } from './mockCatalogStampStore'

export function mockDeleteItem(itemId: string): Promise<void> {
  void itemId
  bumpAllCatalogStamps()
  return Promise.resolve()
}
