import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { pick, randomInt } from './random'

const ALIASES = ['Mi Tienda Artesanal', 'Tienda de Don Carlos', 'Productos Locales', 'El Mercadito']
const WELCOME_TEXTS = ['Bienvenido a nuestra tienda', '¡Hola! Echa un vistazo', 'Descubre nuestros productos', 'Gracias por visitarnos']
const DESCRIPTIONS = ['Productos hechos a mano en Oaxaca', 'Artesanías mexicanas de calidad', 'Lo mejor del mercado local', 'Elaborados con amor y tradición']
const LOCATIONS = ['Oaxaca, México', 'México City', 'Guadalajara, Jalisco', 'San Miguel de Allende']
const LOCATION_ZIPS = ['68000', '06500', '44100', '37700']

const PAY_OPTIONS: Array<'cash' | 'credit' | 'transfer' | 'other'> = ['cash', 'credit', 'transfer', 'other']
const DELIVERY_TYPES: Array<'location-pickup' | 'delivery' | 'shipping'> = ['location-pickup', 'delivery', 'shipping']

function randomSubset<T>(arr: T[], minSize: number = 1): T[] {
  const size = randomInt(minSize, Math.min(arr.length, 3))
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}

export function mockFetchPublicCatalog(catalogId: string): Promise<Catalog> {
  const catalog: Catalog = {
    _id: catalogId,
    userId: `user_${Math.random().toString(36).substr(2, 5)}`,
    alias: pick(ALIASES),
    welcomeText: pick(WELCOME_TEXTS),
    description: pick(DESCRIPTIONS),
    payOptions: randomSubset(PAY_OPTIONS),
    deliveryType: randomSubset(DELIVERY_TYPES),
    location: pick(LOCATIONS),
    locationZip: pick(LOCATION_ZIPS),
    deliveryDates: [],
    deliveryLocations: [],
  }
  return Promise.resolve(catalog)
}
