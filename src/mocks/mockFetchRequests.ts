import type { FetchRequestsParams } from '@/sections/requests/actions/fetchRequests'
import type { ServiceRequest } from '@/sections/requests/types'
import { listRequests } from './mockRequestStore'

export function mockFetchRequests(
  params: FetchRequestsParams,
): Promise<ServiceRequest[]> {
  return Promise.resolve(listRequests(params.role, params.status))
}
