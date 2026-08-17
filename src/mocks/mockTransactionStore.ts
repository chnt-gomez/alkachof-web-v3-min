import type { CatalogSummary } from '@/sections/transactions/actions/fetchCatalogSummaries'
import type { ProfileSummary } from '@/sections/transactions/actions/fetchProfileSummaries'
import type {
  PurchaseLine,
  TransactionRole,
  TransactionStatus,
  TransactionSummary,
} from '@/sections/transactions/types'
import { randomId } from './random'

export type MockTransactionRecord = {
  summary: TransactionSummary
  /** The role the mock user plays in this transaction. */
  role: TransactionRole
  purchases: PurchaseLine[]
}

const store = new Map<string, MockTransactionRecord>()

// Seeded shops (buyer view resolves `catalogId` → shop name) and buyers (seller
// view resolves `counterpartyId` → buyer name) with es-MX display names.
const SHOPS: CatalogSummary[] = [
  { catalogId: 'cat_rebozos', alias: 'Rebozos Oaxaca' },
  { catalogId: 'cat_alebrijes', alias: 'Alebrijes de Miguel' },
  { catalogId: 'cat_talavera', alias: 'Talavera La Tiendita' },
  { catalogId: 'cat_cafe', alias: 'Café de la Sierra' },
]

const BUYERS: ProfileSummary[] = [
  { userId: 'buyer_ana', alias: 'Ana Ramírez' },
  { userId: 'buyer_carlos', alias: 'Carlos Mendoza' },
  { userId: 'buyer_sofia', alias: 'Sofía Gutiérrez' },
  { userId: 'buyer_diego', alias: 'Diego Herrera' },
]

const PRODUCTS: { name: string; price: number }[] = [
  { name: 'Rebozo de Colores', price: 45000 },
  { name: 'Blusa Bordada a Mano', price: 38000 },
  { name: 'Aretes de Filigrana', price: 22000 },
  { name: 'Bolsa de Palma Tejida', price: 18000 },
  { name: 'Alebrije Tallado', price: 65000 },
  { name: 'Mezcal Artesanal', price: 52000 },
  { name: 'Talavera Pintada a Mano', price: 41000 },
  { name: 'Huipil Tradicional', price: 78000 },
  { name: 'Café de Oaxaca 500g', price: 19000 },
  { name: 'Chocolate de Metate', price: 15000 },
]

type Seed = {
  role: TransactionRole
  status: TransactionStatus
  daysAgo: number
  lines: { product: number; quantity: number }[]
  /** Index into SHOPS/BUYERS for the header counterparty (see buildRecord). */
  party?: number
  /** Simulate a legacy buyer order created before `catalogId` shipped. */
  legacyCatalog?: boolean
}

// Deterministic seed so the demo list is stable across reloads within a session.
const SEEDS: Seed[] = [
  { role: 'buyer', status: 'EN-ROUTE', daysAgo: 1, party: 0, lines: [{ product: 0, quantity: 1 }, { product: 2, quantity: 2 }] },
  { role: 'buyer', status: 'DELIVERED', daysAgo: 6, party: 1, lines: [{ product: 5, quantity: 1 }] },
  { role: 'buyer', status: 'PROCESSING', daysAgo: 0, party: 2, lines: [{ product: 8, quantity: 3 }, { product: 9, quantity: 2 }] },
  { role: 'buyer', status: 'READY-FOR-PICKUP', daysAgo: 2, party: 3, lines: [{ product: 3, quantity: 1 }] },
  { role: 'buyer', status: 'RETURNED', daysAgo: 20, party: 0, lines: [{ product: 1, quantity: 1 }] },
  { role: 'buyer', status: 'REJECTED', daysAgo: 9, legacyCatalog: true, lines: [{ product: 7, quantity: 1 }] },
  { role: 'seller', status: 'STARTED', daysAgo: 0, party: 0, lines: [{ product: 4, quantity: 1 }] },
  { role: 'seller', status: 'EN-ROUTE', daysAgo: 3, party: 1, lines: [{ product: 6, quantity: 2 }] },
  { role: 'seller', status: 'DELIVERED', daysAgo: 8, party: 2, lines: [{ product: 9, quantity: 4 }, { product: 8, quantity: 1 }] },
  { role: 'seller', status: 'PROCESSING', daysAgo: 1, party: 3, lines: [{ product: 1, quantity: 1 }, { product: 3, quantity: 2 }] },
  { role: 'seller', status: 'DELIVERED', daysAgo: 14, party: 0, lines: [{ product: 0, quantity: 1 }] },
]

function buildRecord(seed: Seed): MockTransactionRecord {
  const id = randomId()
  const dateCreated = new Date(Date.now() - seed.daysAgo * 86_400_000).toISOString()

  const purchases: PurchaseLine[] = seed.lines.map(({ product, quantity }) => {
    const { name, price } = PRODUCTS[product]
    return {
      id: randomId(),
      quantity,
      totalPrice: price * quantity,
      item: {
        id: randomId(),
        name,
        imgPath: `https://picsum.photos/seed/${id}-${product}/600/800`,
        price,
      },
    }
  })

  const totalAmount = purchases.reduce((sum, line) => sum + line.totalPrice, 0)

  const party = seed.party ?? 0
  const isBuyer = seed.role === 'buyer'
  // Buyer view labels by `catalogId` (shop name); the seller's own user id is
  // irrelevant, so leave it random. Seller view labels by `counterpartyId`
  // (buyer name); its own catalog id is ignored, so leave it random.
  const counterpartyId = isBuyer ? randomId() : BUYERS[party % BUYERS.length].userId
  const catalogId = isBuyer
    ? seed.legacyCatalog
      ? null
      : SHOPS[party % SHOPS.length].catalogId
    : randomId()

  return {
    role: seed.role,
    purchases,
    summary: {
      id,
      status: seed.status,
      dateCreated,
      dateUpdated: dateCreated,
      purchaseIds: purchases.map((p) => p.id),
      itemCount: purchases.length,
      totalAmount,
      counterpartyId,
      catalogId,
    },
  }
}

let seeded = false
function ensureSeeded() {
  if (seeded) return
  for (const seed of SEEDS) {
    const record = buildRecord(seed)
    store.set(record.summary.id, record)
  }
  seeded = true
}

export function getTransactionRecords(): MockTransactionRecord[] {
  ensureSeeded()
  return Array.from(store.values())
}

export function getTransactionRecordById(id: string): MockTransactionRecord | undefined {
  ensureSeeded()
  return store.get(id)
}

/**
 * Resolve seeded shop names for the buyer view. Mirrors the real
 * `GET /catalog/summaries`: unknown ids are omitted (never fabricated).
 */
export function getCatalogSummaries(catalogIds: string[]): Record<string, CatalogSummary> {
  const known = new Map(SHOPS.map((s) => [s.catalogId, s]))
  const out: Record<string, CatalogSummary> = {}
  for (const id of catalogIds) {
    const shop = known.get(id)
    if (shop) out[id] = shop
  }
  return out
}

/**
 * Resolve seeded buyer names for the seller view. Mirrors the real
 * `GET /profile/summaries`: unknown ids are omitted (never fabricated).
 */
export function getProfileSummaries(userIds: string[]): Record<string, ProfileSummary> {
  const known = new Map(BUYERS.map((b) => [b.userId, b]))
  const out: Record<string, ProfileSummary> = {}
  for (const id of userIds) {
    const buyer = known.get(id)
    if (buyer) out[id] = buyer
  }
  return out
}

/** Mutate a record's status in place so the list and dialog reflect the change. */
export function setTransactionRecordStatus(
  id: string,
  status: TransactionStatus,
): MockTransactionRecord | undefined {
  ensureSeeded()
  const record = store.get(id)
  if (!record) return undefined
  record.summary = { ...record.summary, status, dateUpdated: new Date().toISOString() }
  return record
}
