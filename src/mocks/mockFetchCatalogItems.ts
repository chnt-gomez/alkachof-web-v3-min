import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { pick, randomInt, randomId } from './random'

const ITEM_NAMES = ['Blusa Artesanal', 'Falda Tradicional', 'Bolsa Tejida', 'Collar Único', 'Rebozo de Colores', 'Huipil Bordado', 'Pulsera de Cuentas', 'Morral Otomí']
const ITEM_DESCRIPTIONS = [
  'Tejido a mano con técnicas ancestrales',
  'Bordado tradicional en hilo mexicano',
  'Elaborado por artesanos locales',
  'Pieza única, hecha con amor',
  'Colores naturales y auténticos',
  'Diseño tradicional con toque moderno',
]
const SIZES = [['S', 'M', 'L', 'XL'], ['Único'], ['25cm', '30cm', '35cm']]

export function mockFetchCatalogItems(catalogId: string): Promise<Item[]> {
  const itemCount = randomInt(4, 12)
  const items: Item[] = []

  for (let i = 0; i < itemCount; i++) {
    const seedId = randomId()
    const item: Item = {
      _id: `item_${seedId}`,
      catalogId,
      name: pick(ITEM_NAMES),
      description: pick(ITEM_DESCRIPTIONS),
      price: randomInt(50, 2000),
      stock: randomInt(0, 30),
      imgPath: `https://picsum.photos/seed/${seedId}/600/800`,
      sizes: pick(SIZES),
      updatedOn: new Date().toISOString(),
    }
    items.push(item)
  }

  return Promise.resolve(items)
}
