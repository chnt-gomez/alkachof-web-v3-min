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
 * Which slice of the Pedidos feed to read.
 *
 * `active` is the default list: the API leaves out orders that finished
 * (DELIVERED / REJECTED / RETURNED for products, COMPLETED / REJECTED /
 * CANCELED for services) and ones with no activity for 5 days, so the screen
 * stays short on its own. `history` returns everything, archived rows included,
 * and is the **only** way to reach an order that dropped out.
 *
 * Nothing is ever deleted server-side — an order belongs to both parties, so one
 * of them clearing their screen must not destroy the other's record. Archiving
 * is purely a read-time filter, and a row un-archives the moment its status
 * changes. Requests and transactions share the rule; see
 * `followup.OrdersFeedPagination.md`.
 */
export type OrdersScope = 'active' | 'history'

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
  /**
   * The shop that generated the order. Used on the buyer view to resolve the
   * shop name via `GET /catalog/summaries`. `null` on legacy transactions
   * created before this field shipped — render a generic fallback label.
   */
  catalogId: string | null
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
