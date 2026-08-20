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

const SERVICE_NAMES = [
  'Corte de Cabello',
  'Reparación de Bicicleta',
  'Clases de Bordado',
  'Entrega a Domicilio',
  'Instalación de Cortinas',
]
const SERVICE_DESCRIPTIONS = [
  'Incluye lavado y peinado',
  'Servicio a domicilio en la zona centro',
  'Sesiones de dos horas, material incluido',
  'Cotizamos según la distancia',
  'Trabajo garantizado por seis meses',
]

export function mockFetchCatalogItems(catalogId: string): Promise<Item[]> {
  const itemCount = randomInt(4, 12)
  const items: Item[] = []

  for (let i = 0; i < itemCount; i++) {
    const seedId = randomId()
    // Roughly one in four items is a service, and most services carry no price
    // so the "Precio a convenir" path is exercised in dev.
    const isServiceItem = randomInt(0, 3) === 0
    const item: Item = {
      _id: `item_${seedId}`,
      catalogId,
      name: isServiceItem ? pick(SERVICE_NAMES) : pick(ITEM_NAMES),
      description: isServiceItem ? pick(SERVICE_DESCRIPTIONS) : pick(ITEM_DESCRIPTIONS),
      price: isServiceItem ? (randomInt(0, 2) === 0 ? randomInt(200, 1500) : 0) : randomInt(50, 2000),
      imgPath: `https://picsum.photos/seed/${seedId}/600/800`,
      outOfStock: isServiceItem ? false : randomInt(0, 4) === 0,
      updatedOn: new Date().toISOString(),
      type: isServiceItem ? 'service' : 'product',
    }
    items.push(item)
  }

  return Promise.resolve(items)
}
