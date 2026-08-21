import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { pick, randomInt } from './random'

const ITEM_NAMES = ['Blusa Artesanal', 'Falda Tradicional', 'Bolsa Tejida', 'Collar Único', 'Rebozo de Colores']
const ITEM_DESCRIPTIONS = [
  'Tejido a mano con técnicas ancestrales',
  'Bordado tradicional en hilo mexicano',
  'Pieza única, hecha con amor',
]

const SERVICE_NAMES = ['Corte de Cabello', 'Reparación de Bicicleta', 'Clases de Bordado']
const SERVICE_DESCRIPTIONS = ['Incluye lavado y peinado', 'Servicio a domicilio en la zona centro']

export function mockFetchItem(itemId: string): Promise<Item> {
  const isServiceItem = randomInt(0, 3) === 0
  const item: Item = {
    _id: itemId,
    catalogId: 'mock_catalog',
    name: isServiceItem ? pick(SERVICE_NAMES) : pick(ITEM_NAMES),
    description: isServiceItem ? pick(SERVICE_DESCRIPTIONS) : pick(ITEM_DESCRIPTIONS),
    price: isServiceItem ? 0 : randomInt(50, 2000),
    imgPath: `https://picsum.photos/seed/${itemId}/600/800`,
    outOfStock: false,
    updatedOn: new Date().toISOString(),
    type: isServiceItem ? 'service' : 'product',
  }
  return Promise.resolve(item)
}
