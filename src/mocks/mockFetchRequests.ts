import type {
  FetchRequestsParams,
  RequestListResult,
} from '@/sections/requests/actions/fetchRequests'
import { listRequests } from './mockRequestStore'
import { isArchivedOrder, TERMINAL_REQUEST_STATUSES } from './ordersArchive'

export function mockFetchRequests(
  params: FetchRequestsParams,
): Promise<RequestListResult> {
  const limit = params.limit ?? 20
  const skip = params.skip ?? 0

  const matching = listRequests(params.role, params.status).filter((request) =>
    // The active feed hides finished and long-untouched bookings; the history
    // shows everything, exactly as the API does.
    params.scope === 'history'
      ? true
      : !isArchivedOrder(request, TERMINAL_REQUEST_STATUSES),
  )

  return Promise.resolve({
    requests: matching.slice(skip, skip + limit),
    total: matching.length,
    limit,
    skip,
  })
}
