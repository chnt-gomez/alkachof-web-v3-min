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
}

// Deterministic seed so the demo list is stable across reloads within a session.
const SEEDS: Seed[] = [
  { role: 'buyer', status: 'EN-ROUTE', daysAgo: 1, lines: [{ product: 0, quantity: 1 }, { product: 2, quantity: 2 }] },
  { role: 'buyer', status: 'DELIVERED', daysAgo: 6, lines: [{ product: 5, quantity: 1 }] },
  { role: 'buyer', status: 'PROCESSING', daysAgo: 0, lines: [{ product: 8, quantity: 3 }, { product: 9, quantity: 2 }] },
  { role: 'buyer', status: 'READY-FOR-PICKUP', daysAgo: 2, lines: [{ product: 3, quantity: 1 }] },
  { role: 'buyer', status: 'RETURNED', daysAgo: 20, lines: [{ product: 1, quantity: 1 }] },
  { role: 'buyer', status: 'REJECTED', daysAgo: 9, lines: [{ product: 7, quantity: 1 }] },
  { role: 'seller', status: 'STARTED', daysAgo: 0, lines: [{ product: 4, quantity: 1 }] },
  { role: 'seller', status: 'EN-ROUTE', daysAgo: 3, lines: [{ product: 6, quantity: 2 }] },
  { role: 'seller', status: 'DELIVERED', daysAgo: 8, lines: [{ product: 9, quantity: 4 }, { product: 8, quantity: 1 }] },
  { role: 'seller', status: 'PROCESSING', daysAgo: 1, lines: [{ product: 1, quantity: 1 }, { product: 3, quantity: 2 }] },
  { role: 'seller', status: 'DELIVERED', daysAgo: 14, lines: [{ product: 0, quantity: 1 }] },
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
      counterpartyId: randomId(),
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
