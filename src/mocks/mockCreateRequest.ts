import type { ServiceRequest } from '@/sections/requests/types'
import { addRequest } from './mockRequestStore'

export function mockCreateRequest(
  serviceId: string,
  customerNote: string,
): Promise<ServiceRequest> {
  return Promise.resolve(addRequest(serviceId, customerNote))
}
