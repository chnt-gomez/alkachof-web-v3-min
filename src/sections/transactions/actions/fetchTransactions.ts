import { api } from '@/lib/api'
import type {
  OrdersScope,
  TransactionRole,
  TransactionStatus,
  TransactionSummary,
} from '../types'

export type FetchTransactionsParams = {
  role: TransactionRole
  status?: TransactionStatus
  limit?: number
  skip?: number
  /** `active` (default) hits the filtered feed; `history` includes archived rows. */
  scope?: OrdersScope
}

export type TransactionListResult = {
  transactions: TransactionSummary[]
  total: number
  limit: number
  skip: number
}

/**
 * A page of the caller's product orders for one role.
 *
 * `/transaction/all` is the **active feed**, not everything — despite the name,
 * the API filters out finished and long-untouched orders. `/transaction/history`
 * is the same shape over the full set. Both take the same query parameters, so
 * only the path differs.
 */
export async function fetchTransactions(
  params: FetchTransactionsParams,
): Promise<TransactionListResult> {
  const search = new URLSearchParams({ role: params.role })
  if (params.status) search.set('status', params.status)
  search.set('limit', String(params.limit ?? 20))
  search.set('skip', String(params.skip ?? 0))

  const path = params.scope === 'history' ? '/transaction/history' : '/transaction/all'
  return api<TransactionListResult>(`${path}?${search.toString()}`)
}
