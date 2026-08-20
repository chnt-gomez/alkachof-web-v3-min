import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockUpdateRequestStatus } from '@/mocks'
import type { RequestStatus, ServiceRequest } from '../types'

/**
 * Move a request to a new status. Member-gated on the backend, which enforces
 * which role may perform which transition.
 *
 * Two optional payloads, each honoured on exactly one transition and silently
 * ignored on the others (the server 200s either way, so never read the response
 * as "my value was applied" — read the echoed request):
 *
 * - `finalPrice` (cents) on `→ PRICED`: that transition *is* the seller quoting.
 * - `customerNote` on `→ REQUESTED`: the buyer turning a quote down may restate
 *   the job first. It **overwrites** the stored note — there is no history, and
 *   omitting it leaves the existing note alone.
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  finalPrice?: number,
  customerNote?: string,
): Promise<ServiceRequest> {
  if (IS_DEV_STAGE) return mockUpdateRequestStatus(requestId, status, finalPrice, customerNote)
  const data = await api<{ message: string; request: ServiceRequest }>(
    `/request/${requestId}/status`,
    {
      method: 'POST',
      body: {
        status,
        ...(finalPrice === undefined ? {} : { finalPrice }),
        ...(customerNote === undefined ? {} : { customerNote }),
      },
    },
  )
  return data.request
}
