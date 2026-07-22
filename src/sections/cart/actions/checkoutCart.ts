import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCheckoutCart } from '@/mocks'
import type { CartLine, CheckoutResult } from '../types'

// The cart is client-side, so checkout sends the catalog + its lines to the
// backend rather than referencing a server-side cart id.
export async function checkoutCart(
  catalogId: string,
  lines: CartLine[]
): Promise<CheckoutResult> {
  if (IS_DEV_STAGE) return mockCheckoutCart(catalogId, lines)
  // Send only itemId + quantity; the server resolves the authoritative price.
  const items = lines.map(({ itemId, quantity }) => ({ itemId, quantity }))
  const data = await api<{ message: string; purchases: string[]; transaction: CheckoutResult['transaction'] }>(
    '/cart/checkout',
    {
      method: 'POST',
      body: { catalogId, items },
    }
  )
  return {
    purchases: data.purchases,
    transaction: data.transaction,
  }
}
