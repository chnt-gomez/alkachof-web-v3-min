import { deleteCartFromStore } from './mockCartStore'

export function mockDeleteCart(cartId: string): Promise<void> {
  deleteCartFromStore(cartId)
  return Promise.resolve()
}
