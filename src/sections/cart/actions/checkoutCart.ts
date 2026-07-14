import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCheckoutCart } from '@/mocks'
import type { CheckoutResult } from '../types'

export async function checkoutCart(cartId: string): Promise<CheckoutResult> {
  if (IS_DEV_STAGE) return mockCheckoutCart(cartId)
  const data = await api<{ message: string; purchases: string[]; transaction: CheckoutResult['transaction'] }>(
    `/cart/${cartId}/checkout`,
    {
      method: 'POST',
    }
  )
  return {
    purchases: data.purchases,
    transaction: data.transaction,
  }
}
