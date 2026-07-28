import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { LocationInput } from '@/sections/catalog/actions/createLocation'
import { pick, randomId, randomInt } from './random'

// Shared in-memory store so read/create/update resolve to the same location
// within a dev-stage session, keyed by catalogId.
const byCatalog = new Map<string, CatalogLocation>()

const STREETS = ['Av. Insurgentes Sur', 'Calle Madero', 'Av. Reforma', 'Calle Juárez']
const NEIGHBORHOODS = ['Roma Norte', 'Condesa', 'Del Valle', 'Coyoacán', 'Polanco']

// Coordinates scattered around central Ciudad de México.
function seedLocation(catalogId: string): CatalogLocation {
  return {
    _id: randomId(),
    lat: 19.4326 + (Math.random() - 0.5) * 0.06,
    lng: -99.1332 + (Math.random() - 0.5) * 0.06,
    street_name: pick(STREETS),
    city: 'Ciudad de México',
    state: 'CDMX',
    number: String(randomInt(1, 500)),
    additional_number: '',
    neighborhood: pick(NEIGHBORHOODS),
    catalogId,
    zoneId: null,
  }
}

/** Strips undefined fields so a partial input never blanks existing values. */
function applyInput(base: CatalogLocation, input: LocationInput): CatalogLocation {
  const next = { ...base }
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) (next as Record<string, unknown>)[key] = value
  }
  return next
}

export function readLocationByCatalog(catalogId: string): CatalogLocation | null {
  if (!byCatalog.has(catalogId)) byCatalog.set(catalogId, seedLocation(catalogId))
  return byCatalog.get(catalogId) ?? null
}

export function createLocationInStore(
  catalogId: string,
  input: LocationInput,
): CatalogLocation {
  const created = applyInput(seedLocation(catalogId), input)
  byCatalog.set(catalogId, created)
  return created
}

export function updateLocationInStore(
  locationId: string,
  input: LocationInput,
): CatalogLocation {
  for (const [catalogId, location] of byCatalog) {
    if (location._id === locationId) {
      const updated = applyInput(location, input)
      byCatalog.set(catalogId, updated)
      return updated
    }
  }
  // Unknown id — return a standalone updated record so the UI still resolves.
  return applyInput({ ...seedLocation('unknown'), _id: locationId }, input)
}
