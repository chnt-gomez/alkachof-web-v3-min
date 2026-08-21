import { randomId } from './random'
import { isService } from '@/lib/item'
import { ServiceInCartError } from '@/sections/cart/actions/checkoutCart'
import type { CartLine, CheckoutResult, Transaction } from '@/sections/cart/types'

const userId = 'mock-user-id'
const sellerId = 'mock-seller-id'

export function mockCheckoutCart(
  _catalogId: string,
  lines: CartLine[]
): Promise<CheckoutResult> {
  if (lines.length === 0) throw new Error('El carrito está vacío')

  // Mirrors the server: a cart holding a service is refused atomically, naming
  // the offending item and creating no purchases at all.
  const service = lines.find((line) => isService(line))
  if (service) {
    return Promise.reject(
      new ServiceInCartError(
        'Service items cannot be purchased through checkout',
        service.itemId,
      ),
    )
  }

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
