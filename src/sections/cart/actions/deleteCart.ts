import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockDeleteCart } from '@/mocks'

export async function deleteCart(cartId: string): Promise<void> {
  if (IS_DEV_STAGE) return mockDeleteCart(cartId)
  await api(`/cart/${cartId}/delete`, {
    method: 'POST',
  })
}
