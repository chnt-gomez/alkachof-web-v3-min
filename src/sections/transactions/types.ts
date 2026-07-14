export type TransactionStatus =
  | 'STARTED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'READY-FOR-PICKUP'
  | 'EN-ROUTE'
  | 'DELIVERED'
  | 'RETURNED'

/** Which side of a transaction the current user is on. */
export type TransactionRole = 'buyer' | 'seller'

/**
 * The checkout hand-off record. `status` is the source of truth for the
 * lifecycle (legacy per-purchase status is ignored). Returned by checkout and
 * owned by this section; re-exported from the cart section for convenience.
 */
export type Transaction = {
  id: string
  purchaseIds: string[]
  buyerId: string
  sellerId: string
  status: TransactionStatus
  dateCreated: string
  dateUpdated: string
}

/** A transaction enriched for list display (item count + total, no line detail). */
export type TransactionSummary = {
  id: string
  status: TransactionStatus
  dateCreated: string
  dateUpdated: string
  purchaseIds: string[]
  itemCount: number
  /** Sum of every line's totalPrice, in cents. */
  totalAmount: number
  /** The other party's user id (seller when I'm the buyer, and vice versa). */
  counterpartyId: string
}

/** A single purchased line within a transaction, enriched with item display data. */
export type PurchaseLine = {
  id: string
  quantity: number
  /** Line total in cents. */
  totalPrice: number
  item: {
    id: string
    name: string
    imgPath: string
    /** Unit price in cents. */
    price: number
  }
}
