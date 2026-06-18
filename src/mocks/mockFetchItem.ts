import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { pick, randomInt } from './random'

const ITEM_NAMES = ['Blusa Artesanal', 'Falda Tradicional', 'Bolsa Tejida', 'Collar Único', 'Rebozo de Colores']
const ITEM_DESCRIPTIONS = [
  'Tejido a mano con técnicas ancestrales',
  'Bordado tradicional en hilo mexicano',
  'Pieza única, hecha con amor',
]

export function mockFetchItem(itemId: string): Promise<Item> {
  const item: Item = {
    _id: itemId,
    catalogId: 'mock_catalog',
    name: pick(ITEM_NAMES),
    description: pick(ITEM_DESCRIPTIONS),
    price: randomInt(50, 2000),
    stock: randomInt(0, 30),
    imgPath: `https://picsum.photos/seed/${itemId}/600/800`,
    sizes: ['Único'],
    updatedOn: new Date().toISOString(),
  }
  return Promise.resolve(item)
}
