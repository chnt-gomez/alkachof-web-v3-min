import { getAllCartsByOwnerFromStore } from './mockCartStore'
import type { Cart } from '@/sections/cart/types'

export function mockFetchCarts(): Promise<Cart[]> {
  const userId = 'mock-user-id'
  const carts = getAllCartsByOwnerFromStore(userId)
  return Promise.resolve(carts)
}
