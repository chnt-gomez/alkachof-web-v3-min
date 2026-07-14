import { randomId } from './random'
import type { Cart } from '@/sections/cart/types'

const carts = new Map<string, Cart>()

export function getCartStore() {
  return carts
}

export function getCartByIdFromStore(cartId: string): Cart | undefined {
  return carts.get(cartId)
}

export function getCartByOwnerAndCatalogFromStore(
  ownerId: string,
  catalogId: string
): Cart | undefined {
  return Array.from(carts.values()).find(
    (c) => c.ownerId === ownerId && c.catalogId === catalogId
  )
}

export function getAllCartsByOwnerFromStore(ownerId: string): Cart[] {
  return Array.from(carts.values()).filter((c) => c.ownerId === ownerId)
}

export function insertCartToStore(cart: Omit<Cart, 'id'>): Cart {
  const id = randomId()
  const newCart: Cart = { ...cart, id }
  carts.set(id, newCart)
  return newCart
}

export function updateCartInStore(cartId: string, cart: Cart): Cart {
  carts.set(cartId, cart)
  return cart
}

export function deleteCartFromStore(cartId: string): void {
  carts.delete(cartId)
}

export function clearCartStore(): void {
  carts.clear()
}
