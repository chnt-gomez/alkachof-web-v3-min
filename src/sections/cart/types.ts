export type CartLine = {
  itemId: string
  quantity: number
}

import type { Transaction } from '@/sections/transactions/types'

export type Cart = {
  id: string
  ownerId: string
  catalogId: string
  items: CartLine[]
  discountCodeApplied: string | null
}

// The transactions section owns this domain type; re-exported here so cart
// consumers (checkout) can keep importing it from '@/sections/cart/types'.
export type { Transaction }

export type CheckoutResult = {
  purchases: string[]
  transaction: Transaction
}
