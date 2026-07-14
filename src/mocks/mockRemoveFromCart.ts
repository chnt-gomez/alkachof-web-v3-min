import { getCartByIdFromStore, updateCartInStore } from './mockCartStore'
import type { Cart } from '@/sections/cart/types'

export function mockRemoveFromCart(cartId: string, itemId: string): Promise<Cart> {
  const cart = getCartByIdFromStore(cartId)
  if (!cart) throw new Error('Cart not found')

  const index = cart.items.findIndex((item) => item.itemId === itemId)
  if (index >= 0) {
    cart.items.splice(index, 1)
  }

  updateCartInStore(cartId, cart)
  return Promise.resolve(cart)
}
