import type { RequestRole, ServiceRequestRow } from '../types'

/**
 * Names the other party on a request, from the reader's side: a buyer's request
 * goes *to* a seller, a seller's comes *from* a buyer. Shared by the card and
 * the detail dialog so the two can't word the same fact differently.
 */
export function requestSubheader(
  row: Pick<ServiceRequestRow, 'counterpartyAlias'>,
  role: RequestRole,
): string {
  return role === 'buyer'
    ? `Solicitud a ${row.counterpartyAlias}`
    : `Solicitud de ${row.counterpartyAlias}`
}
