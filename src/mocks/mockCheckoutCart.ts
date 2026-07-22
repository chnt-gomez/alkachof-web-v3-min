import { randomId } from './random'
import type { CartLine, CheckoutResult, Transaction } from '@/sections/cart/types'

const userId = 'mock-user-id'
const sellerId = 'mock-seller-id'

export function mockCheckoutCart(
  _catalogId: string,
  lines: CartLine[]
): Promise<CheckoutResult> {
  if (lines.length === 0) throw new Error('El carrito está vacío')

  const purchases = lines.map(() => randomId())
  const transaction: Transaction = {
    id: randomId(),
    purchaseIds: purchases,
    buyerId: userId,
    sellerId,
    status: 'STARTED',
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
  }

  return Promise.resolve({
    purchases,
    transaction,
  })
}
