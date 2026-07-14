import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockRemoveFromCart } from '@/mocks'
import type { Cart } from '../types'

export async function removeFromCart(cartId: string, itemId: string): Promise<Cart> {
  if (IS_DEV_STAGE) return mockRemoveFromCart(cartId, itemId)
  const data = await api<{ message: string; cart: Cart }>(
    `/cart/${cartId}/remove`,
    {
      method: 'POST',
      body: { itemId },
    }
  )
  return data.cart
}
