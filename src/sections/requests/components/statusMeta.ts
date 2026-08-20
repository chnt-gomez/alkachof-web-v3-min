import type { RequestStatus } from '../types'

/**
 * Spanish copy is the client's to own — the API returns raw enums (build guide
 * §5, open question 1). The labels below are the badge text; `hint` is the
 * "what happens next" line, phrased from the reader's side.
 */
export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  REQUESTED: { label: 'Esperando cotización', className: 'bg-secondary text-secondary-foreground' },
  PRICED: { label: 'Cotizado', className: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Aceptado', className: 'bg-blue-100 text-blue-800' },
  SERVING: { label: 'En proceso', className: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completado', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive' },
  CANCELED: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
}

/** Statuses in lifecycle order (used by the filter chips). */
export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS_META) as RequestStatus[]

export function requestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_META[status].label
}

/**
 * One line telling the reader what the request is waiting for, from their own
 * side. Returns null for terminal statuses, where the badge says it all.
 */
export function requestStatusHint(
  status: RequestStatus,
  role: 'buyer' | 'seller',
): string | null {
  switch (status) {
    case 'REQUESTED':
      // No seller hint: the "Fijar precio" button on the same screen already
      // says what to do, so a line telling them to do it is pure duplication.
      return role === 'seller' ? null : 'El vendedor está preparando tu cotización.'
    case 'PRICED':
      return role === 'buyer'
        ? 'Revisa el precio y decide si lo aceptas.'
        : 'Enviaste tu precio. El comprador debe aceptarlo.'
    case 'ACCEPTED':
      return role === 'seller'
        ? 'El comprador aceptó tu precio. Inicia cuando estés listo.'
        : 'Aceptaste el precio. El vendedor iniciará el servicio.'
    case 'SERVING':
      return 'El servicio está en proceso. Cualquiera de los dos puede marcarlo como completado.'
    case 'REJECTED':
      return role === 'buyer'
        ? 'El vendedor rechazó esta solicitud.'
        : 'Rechazaste esta solicitud.'
    default:
      return null
  }
}
