import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchRequests } from '@/mocks'
import type { RequestRole, RequestStatus, ServiceRequest } from '../types'

export type FetchRequestsParams = {
  role: RequestRole
  status?: RequestStatus
}

/**
 * The caller's requests, scoped by JWT. Unpaginated by design — the backend
 * defers pagination on this endpoint, so there is no `limit`/`skip` and no
 * "load more" in the UI.
 */
export async function fetchRequests(
  params: FetchRequestsParams,
): Promise<ServiceRequest[]> {
  if (IS_DEV_STAGE) return mockFetchRequests(params)

  const search = new URLSearchParams({ role: params.role })
  if (params.status) search.set('status', params.status)

  const data = await api<{ requests: ServiceRequest[] }>(
    `/request/all?${search.toString()}`,
  )
  return data.requests
}
