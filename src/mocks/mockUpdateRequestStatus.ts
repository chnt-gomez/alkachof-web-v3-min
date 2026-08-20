import type { RequestStatus, ServiceRequest } from '@/sections/requests/types'
import { patchRequest } from './mockRequestStore'

export function mockUpdateRequestStatus(
  requestId: string,
  status: RequestStatus,
  finalPrice?: number,
  customerNote?: string,
): Promise<ServiceRequest> {
  return Promise.resolve(patchRequest(requestId, status, finalPrice, customerNote))
}
