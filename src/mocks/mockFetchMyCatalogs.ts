import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { pick, randomId, randomInt } from './random'

const ALIASES = ['Mi Tienda Artesanal', 'Tienda de Don Carlos', 'Productos Locales', 'El Mercadito']
const WELCOME_TEXTS = ['Bienvenido a nuestra tienda', '¡Hola! Echa un vistazo', 'Descubre nuestros productos']
const DESCRIPTIONS = ['Productos hechos a mano en Oaxaca', 'Artesanías mexicanas de calidad', 'Lo mejor del mercado local']
const LOCATIONS = ['Oaxaca, México', 'Ciudad de México', 'Guadalajara, Jalisco']
const LOCATION_ZIPS = ['68000', '06500', '44100']

let cache: Catalog[] | null = null

function buildCatalog(): Catalog {
  return {
    _id: randomId(),
    userId: 'me',
    alias: pick(ALIASES),
    welcomeText: pick(WELCOME_TEXTS),
    description: pick(DESCRIPTIONS),
    payOptions: ['cash', 'transfer'],
    deliveryType: ['delivery'],
    location: pick(LOCATIONS),
    locationZip: pick(LOCATION_ZIPS),
    deliveryDates: [],
    deliveryLocations: [],
  }
}

export function mockFetchMyCatalogs(): Promise<Catalog[]> {
  if (cache === null) {
    cache = Array.from({ length: randomInt(1, 2) }, buildCatalog)
  }
  return Promise.resolve(cache)
}

export function __mockCatalogsCache(): Catalog[] {
  if (cache === null) cache = []
  return cache
}

export function __resetMockCatalogs(): void {
  cache = null
}
