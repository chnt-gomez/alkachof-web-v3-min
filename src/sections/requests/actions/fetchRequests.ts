import { api } from '@/lib/api'
import type { OrdersScope } from '@/sections/transactions/types'
import type { RequestRole, RequestStatus, ServiceRequest } from '../types'

export type FetchRequestsParams = {
  role: RequestRole
  status?: RequestStatus
  limit?: number
  skip?: number
  /** `active` (default) hits the filtered feed; `history` includes archived rows. */
  scope?: OrdersScope
}

/** Mirrors the transactions envelope so both feeds can page in lockstep. */
export type RequestListResult = {
  requests: ServiceRequest[]
  /**
   * Rows matching this query across all pages, counted under the *same* filter
   * as the page — so on the active feed it counts active rows only, and
   * `skip + limit < total` is a reliable "there is more".
   */
  total: number
  limit: number
  skip: number
}

/**
 * A page of the caller's service requests for one role, scoped by JWT.
 *
 * `/request/all` is the **active feed**, not everything: the API leaves out
 * finished (COMPLETED / REJECTED / CANCELED) and long-untouched bookings.
 * `/request/history` is the same shape over the full set.
 *
 * This endpoint used to return every request as a bare `{ requests }` with no
 * paging. It now returns a page envelope and at most `limit` rows, so nothing
 * may assume the array is complete — read `total` instead.
 */
export async function fetchRequests(
  params: FetchRequestsParams,
): Promise<RequestListResult> {
  const search = new URLSearchParams({ role: params.role })
  if (params.status) search.set('status', params.status)
  search.set('limit', String(params.limit ?? 20))
  search.set('skip', String(params.skip ?? 0))

  const path = params.scope === 'history' ? '/request/history' : '/request/all'
  return api<RequestListResult>(`${path}?${search.toString()}`)
}
