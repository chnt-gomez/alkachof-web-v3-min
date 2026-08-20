import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreateRequest } from '@/mocks'
import type { ServiceRequest } from '../types'

/**
 * A buyer books a service. Only `serviceId` and the optional `customerNote` are
 * sent — seller and catalog are resolved server-side from the item, and the
 * buyer is always the token's user (a `buyerId` in the body would be ignored).
 *
 * There is no find-or-create: posting twice creates two requests, which is
 * intended (booking the same haircut monthly is normal). Callers must guard
 * against double submits themselves.
 */
export async function createRequest(
  serviceId: string,
  customerNote: string,
): Promise<ServiceRequest> {
  if (IS_DEV_STAGE) return mockCreateRequest(serviceId, customerNote)
  const data = await api<{ message: string; request: ServiceRequest }>(
    '/request/create',
    { method: 'POST', body: { serviceId, customerNote } },
  )
  return data.request
}
