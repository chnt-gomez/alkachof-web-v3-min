import { formatPrice } from '@/lib/format'

/**
 * A request's price. `null` means the seller has not quoted yet, and it uses the
 * *same* string a price-less service item does (`formatItemPrice`), so the item
 * and the request never disagree on screen.
 */
export function formatRequestPrice(finalPrice: number | null): string {
  return finalPrice === null ? 'Precio a convenir' : formatPrice(finalPrice)
}
