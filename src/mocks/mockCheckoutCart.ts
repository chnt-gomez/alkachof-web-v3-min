import { deleteCartFromStore, getCartByIdFromStore } from './mockCartStore'
import { randomId } from './random'
import type { CheckoutResult, Transaction } from '@/sections/cart/types'

const userId = 'mock-user-id'
const sellerId = 'mock-seller-id'

export function mockCheckoutCart(cartId: string): Promise<CheckoutResult> {
  const cart = getCartByIdFromStore(cartId)
  if (!cart) throw new Error('Cart not found')
  if (cart.items.length === 0) throw new Error('Cart is empty')

  const purchases = cart.items.map(() => randomId())
  const transaction: Transaction = {
    id: randomId(),
    purchaseIds: purchases,
    buyerId: userId,
    sellerId,
    status: 'STARTED',
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
  }

  deleteCartFromStore(cartId)

  return Promise.resolve({
    purchases,
    transaction,
  })
}
