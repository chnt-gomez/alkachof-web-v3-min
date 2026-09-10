import { api, ApiError } from '@/lib/api'
import type { CartLine, CheckoutResult } from '../types'

/**
 * Checkout was refused because a line is a service — services are booked
 * through a request, never purchased.
 *
 * The rejection is atomic: no purchases are created, not even for the product
 * lines, so the cart can be repaired and retried with nothing charged. The
 * server names the offending item, which is the only way to identify a service
 * line that was added to the cart before the client knew about item types (such
 * a line carries no `type` to filter on).
 */
export class ServiceInCartError extends Error {
  readonly itemId: string | null
  constructor(message: string, itemId: string | null) {
    super(message)
    this.name = 'ServiceInCartError'
    this.itemId = itemId
  }
}

/** Matches the phase-2 rejections from `/cart/checkout` and `/cart/add`. */
function asServiceRejection(err: unknown): ServiceInCartError | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null
  if (!/service items cannot be/i.test(err.message)) return null
  const body = err.body as { itemId?: unknown } | null
  const itemId = typeof body?.itemId === 'string' ? body.itemId : null
  return new ServiceInCartError(err.message, itemId)
}

// The cart is client-side, so checkout sends the catalog + its lines to the
// backend rather than referencing a server-side cart id.
export async function checkoutCart(
  catalogId: string,
  lines: CartLine[]
): Promise<CheckoutResult> {
  // Send only itemId + quantity; the server resolves the authoritative price.
  const items = lines.map(({ itemId, quantity }) => ({ itemId, quantity }))
  try {
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
  } catch (err) {
    const rejection = asServiceRejection(err)
    if (rejection) throw rejection
    throw err
  }
}
