import type { RequestStatus } from '@/sections/requests/types'
import { REQUEST_STATUS_META } from '@/sections/requests/components/statusMeta'
import type { TransactionStatus } from '../types'
import { STATUS_META } from './statusMeta'

/**
 * Pedidos shows product orders and service requests in one list, but the two
 * carry different status enums. The filter chips therefore work on the **label**
 * rather than the raw enum: a chip matches any row whose status renders as that
 * word, whichever entity it came from.
 *
 * That makes the overlaps do the right thing for free — "En proceso" catches
 * both a `PROCESSING` transaction and a `SERVING` request, and "Rechazado"
 * catches both `REJECTED`s — instead of showing the user two chips that read
 * identically.
 */
export type OrderStatusFilter = {
  label: string
  /** The transaction status this label selects, if any. */
  transaction?: TransactionStatus
  /** The request status this label selects, if any. */
  request?: RequestStatus
}

/** Lifecycle order, interleaving both flows so the row reads as a progression. */
const ORDER: { transaction?: TransactionStatus; request?: RequestStatus }[] = [
  { transaction: 'STARTED' },
  { request: 'REQUESTED' },
  { request: 'PRICED' },
  { request: 'ACCEPTED' },
  { transaction: 'PROCESSING', request: 'SERVING' },
  { transaction: 'READY-FOR-PICKUP' },
  { transaction: 'EN-ROUTE' },
  { transaction: 'DELIVERED' },
  { request: 'COMPLETED' },
  { transaction: 'REJECTED', request: 'REJECTED' },
  { transaction: 'RETURNED' },
  { request: 'CANCELED' },
]

export const ORDER_STATUS_FILTERS: OrderStatusFilter[] = ORDER.map((entry) => ({
  label: entry.transaction
    ? STATUS_META[entry.transaction].label
    : REQUEST_STATUS_META[entry.request!].label,
  ...entry,
}))

export function filterByLabel(label: string | null): OrderStatusFilter | null {
  if (!label) return null
  return ORDER_STATUS_FILTERS.find((f) => f.label === label) ?? null
}
