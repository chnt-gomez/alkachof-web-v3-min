import type { ItemType } from '@/lib/item'

// A cart line is self-contained: it snapshots the item's display data at the
// moment it was added, so the cart renders without re-fetching the catalog.
export type CartLine = {
  itemId: string
  quantity: number
  name: string
  price: number
  imgPath: string
  /**
   * Snapshot of the item's type. Only ever 'product' on lines written after
   * services shipped; absent on lines already in localStorage from before, which
   * `isService` correctly reads as products.
   */
  type?: ItemType
}

import type { Transaction } from '@/sections/transactions/types'

export type Cart = {
  id: string
  catalogId: string
  items: CartLine[]
}

// The transactions section owns this domain type; re-exported here so cart
// consumers (checkout) can keep importing it from '@/sections/cart/types'.
export type { Transaction }

export type CheckoutResult = {
  purchases: string[]
  transaction: Transaction
}
