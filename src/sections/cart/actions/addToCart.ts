import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockAddToCart } from '@/mocks'
import type { Cart } from '../types'

export async function addToCart(itemId: string, quantity: number): Promise<Cart> {
  if (IS_DEV_STAGE) return mockAddToCart(itemId, quantity)
  const data = await api<{ message: string; cart: Cart }>('/cart/add', {
    method: 'POST',
    body: { itemId, quantity },
  })
  return data.cart
}
