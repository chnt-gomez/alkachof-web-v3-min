import { getCartByOwnerAndCatalogFromStore, insertCartToStore, updateCartInStore } from './mockCartStore'
import type { Cart } from '@/sections/cart/types'

const mockCatalogId = '6a0365fdf74fdcb617a8a5b6'
const userId = 'mock-user-id'

export function mockAddToCart(itemId: string, quantity: number): Promise<Cart> {
  let cart = getCartByOwnerAndCatalogFromStore(userId, mockCatalogId)

  if (!cart) {
    cart = insertCartToStore({
      ownerId: userId,
      catalogId: mockCatalogId,
      items: [],
      discountCodeApplied: null,
    })
  }

  const existingIndex = cart.items.findIndex((item) => item.itemId === itemId)
  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += quantity
  } else {
    cart.items.push({ itemId, quantity })
  }

  updateCartInStore(cart.id, cart)
  return Promise.resolve(cart)
}
