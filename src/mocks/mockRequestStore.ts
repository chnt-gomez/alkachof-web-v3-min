import type {
  RequestRole,
  RequestStatus,
  ServiceRequest,
} from '@/sections/requests/types'
import { randomId } from './random'

/** The mock user plays both sides, so each record remembers which. */
type MockRequestRecord = {
  request: ServiceRequest
  role: RequestRole
}

const BUYER_ID = 'mock-user-id'
const SELLER_ID = 'mock-seller-id'

type Seed = {
  role: RequestRole
  status: RequestStatus
  daysAgo: number
  service: string
  customerNote: string
  finalPrice: number | null
}

// Deterministic so the demo list is stable across reloads within a session.
// Covers every status on both sides, weighted toward the ones each role acts
// on: REQUESTED for sellers (the pricing queue), PRICED for buyers.
const SEEDS: Seed[] = [
  {
    role: 'seller',
    status: 'REQUESTED',
    daysAgo: 0,
    service: 'Instalación de Cortinas',
    customerNote:
      'Son 4 ventanas en la sala, medidas 1.20 x 1.50. ¿Puedes el sábado por la mañana?',
    finalPrice: null,
  },
  {
    role: 'seller',
    status: 'REQUESTED',
    daysAgo: 1,
    service: 'Entrega a Domicilio',
    customerNote: '',
    finalPrice: null,
  },
  {
    role: 'seller',
    status: 'PRICED',
    daysAgo: 2,
    service: 'Clases de Bordado',
    customerNote: 'Somos tres personas, nivel principiante. Nos interesan cuatro sesiones.',
    finalPrice: 180000,
  },
  {
    role: 'seller',
    status: 'ACCEPTED',
    daysAgo: 3,
    service: 'Corte de Cabello',
    customerNote: 'Dos niños, sábado por la mañana.',
    finalPrice: 25000,
  },
  {
    role: 'seller',
    status: 'SERVING',
    daysAgo: 4,
    service: 'Reparación de Bicicleta',
    customerNote: 'Se traba el cambio trasero y los frenos están flojos.',
    finalPrice: 45000,
  },
  {
    role: 'seller',
    status: 'COMPLETED',
    daysAgo: 12,
    service: 'Corte de Cabello',
    customerNote: '',
    finalPrice: 25000,
  },
  {
    role: 'buyer',
    status: 'PRICED',
    daysAgo: 0,
    service: 'Instalación de Cortinas',
    customerNote: 'Dos recámaras, cortinas blackout que ya compré.',
    finalPrice: 95000,
  },
  {
    role: 'buyer',
    status: 'REQUESTED',
    daysAgo: 1,
    service: 'Reparación de Bicicleta',
    customerNote: 'Llanta trasera ponchada y necesito ajuste general.',
    finalPrice: null,
  },
  {
    role: 'buyer',
    status: 'ACCEPTED',
    daysAgo: 2,
    service: 'Entrega a Domicilio',
    customerNote: 'Paquete mediano a la colonia Roma, entre semana.',
    finalPrice: 15000,
  },
  {
    role: 'buyer',
    status: 'SERVING',
    daysAgo: 3,
    service: 'Clases de Bordado',
    customerNote: 'Quiero aprender punto de cruz para un regalo.',
    finalPrice: 60000,
  },
  {
    role: 'buyer',
    status: 'REJECTED',
    daysAgo: 8,
    service: 'Entrega a Domicilio',
    customerNote: 'Necesito envío a Tlalpan el mismo día.',
    finalPrice: null,
  },
  {
    role: 'buyer',
    status: 'CANCELED',
    daysAgo: 15,
    service: 'Corte de Cabello',
    customerNote: '',
    finalPrice: null,
  },
]

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

const store = new Map<string, MockRequestRecord>()

function seed() {
  if (store.size > 0) return
  SEEDS.forEach((s, index) => {
    const id = `req_${index}_${randomId()}`
    store.set(id, {
      role: s.role,
      request: {
        id,
        // Stable per seed so the name lookup is deterministic.
        serviceId: `item_svc_${index}`,
        buyerId: s.role === 'buyer' ? BUYER_ID : 'buyer_ana',
        sellerId: s.role === 'seller' ? BUYER_ID : SELLER_ID,
        catalogId: 'mock_catalog',
        status: s.status,
        finalPrice: s.finalPrice,
        customerNote: s.customerNote,
        dateCreated: daysAgoIso(s.daysAgo),
        dateUpdated:
          s.status === 'REQUESTED' ? null : daysAgoIso(Math.max(0, s.daysAgo - 1)),
      },
    })
  })
}

/** Service display names, keyed by the seeded `serviceId`. */
const SERVICE_NAMES = new Map<string, string>(
  SEEDS.map((s, index) => [`item_svc_${index}`, s.service]),
)

export function serviceNameFor(serviceId: string): string | undefined {
  return SERVICE_NAMES.get(serviceId)
}

export function listRequests(role: RequestRole, status?: RequestStatus): ServiceRequest[] {
  seed()
  return [...store.values()]
    .filter((r) => r.role === role)
    .filter((r) => !status || r.request.status === status)
    .map((r) => ({ ...r.request }))
    .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
}

export function patchRequest(
  requestId: string,
  status: RequestStatus,
  finalPrice?: number,
  customerNote?: string,
): ServiceRequest {
  seed()
  const record = store.get(requestId)
  if (!record) throw new Error('Request not found')

  const current = record.request
  // Mirrors the server's price rules: quoting sets it, turning a quote down
  // (PRICED → REQUESTED) clears it, and once ACCEPTED it is frozen — a price
  // sent on any later transition is ignored rather than rejected.
  let nextPrice = current.finalPrice
  if (status === 'PRICED' && finalPrice !== undefined) nextPrice = finalPrice
  else if (status === 'REQUESTED') nextPrice = null

  // The note is rewritable on the mirror transition only — the buyer turning a
  // quote down — and it overwrites, there is no history. Anywhere else the
  // server ignores it rather than rejecting the move.
  const nextNote =
    status === 'REQUESTED' && customerNote !== undefined ? customerNote : current.customerNote

  record.request = {
    ...current,
    status,
    finalPrice: nextPrice,
    customerNote: nextNote,
    dateUpdated: new Date().toISOString(),
  }
  return { ...record.request }
}

export function addRequest(serviceId: string, customerNote: string): ServiceRequest {
  seed()
  const id = `req_${randomId()}`
  const request: ServiceRequest = {
    id,
    serviceId,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    catalogId: 'mock_catalog',
    status: 'REQUESTED',
    finalPrice: null,
    customerNote,
    dateCreated: new Date().toISOString(),
    dateUpdated: null,
  }
  store.set(id, { role: 'buyer', request })
  return { ...request }
}
