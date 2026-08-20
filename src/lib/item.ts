/**
 * 'product' — a stock-backed good, added to the cart and bought through checkout.
 * 'service' — no stock, and often no price until the seller quotes it; requested
 * rather than purchased.
 *
 * Set once when the item is created and immutable afterwards: the backend
 * rejects an update that changes it.
 */
export type ItemType = 'product' | 'service'

/**
 * The single place an item's type is interrogated. Deliberately tests for
 * 'service' rather than "not a product" so it fails safe: an item with a
 * missing or unexpected type reads as a product, which is the conservative
 * answer everywhere it matters (it stays purchasable rather than becoming an
 * unbookable service).
 *
 * Accepts anything carrying a `type`, so cart lines work without a cast.
 */
export function isService(item: { type?: ItemType }): boolean {
  return item.type === 'service'
}
