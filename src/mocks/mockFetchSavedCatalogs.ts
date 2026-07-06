import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { pick, randomId } from './random'

const SAVED_SELLERS: Array<Pick<Catalog, 'alias' | 'description' | 'location' | 'locationZip'>> = [
  {
    alias: 'Dulces La Abuela',
    description: 'Dulces típicos y postres caseros',
    location: 'Puebla, México',
    locationZip: '72000',
  },
  {
    alias: 'Cerámica de Tonalá',
    description: 'Barro y cerámica pintada a mano',
    location: 'Tonalá, Jalisco',
    locationZip: '45400',
  },
  {
    alias: 'Textiles María',
    description: 'Rebozos y huipiles de telar de cintura',
    location: 'San Cristóbal, Chiapas',
    locationZip: '29200',
  },
]

const WELCOME_TEXTS = ['Bienvenido a nuestra tienda', '¡Hola! Echa un vistazo', 'Descubre nuestros productos']

export function mockFetchSavedCatalogs(): Promise<Catalog[]> {
  const catalogs: Catalog[] = SAVED_SELLERS.map((seller) => ({
    _id: randomId(),
    userId: randomId(),
    welcomeText: pick(WELCOME_TEXTS),
    payOptions: ['cash', 'transfer'],
    deliveryType: ['delivery'],
    deliveryDates: [],
    deliveryLocations: [],
    ...seller,
  }))
  return Promise.resolve(catalogs)
}
