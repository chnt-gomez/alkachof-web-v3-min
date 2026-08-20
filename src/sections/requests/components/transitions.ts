import type { RequestRole, RequestStatus } from '../types'

/**
 * Frontend mirror of the API's action matrix (build guide §5): for a given
 * status and role, the only status values the server will accept.
 *
 *   REQUESTED ─(seller quotes)→ PRICED ─(buyer accepts)→ ACCEPTED ─(seller starts)→ SERVING
 *       ▲                          │                                                  │
 *       └──(buyer turns it down)───┘                            (either party)        ▼
 *                                                                              COMPLETED
 *
 * The API answers 400 `Invalid status transition` for both "illegal from this
 * status" and "not your role", so the UI is driven from this table rather than
 * by parsing error text — which makes a 400 mean only one thing: the screen is
 * stale, refetch.
 */
const TRANSITIONS: Partial<
  Record<RequestStatus, Partial<Record<RequestStatus, RequestRole[]>>>
> = {
  REQUESTED: {
    PRICED: ['seller'],
    REJECTED: ['seller'],
    CANCELED: ['buyer'],
  },
  PRICED: {
    ACCEPTED: ['buyer'],
    // Turning a quote down sends it back for a fresh one; the server clears
    // finalPrice to null. Unlimited rounds, and the seller re-quotes blind.
    REQUESTED: ['buyer'],
    CANCELED: ['buyer'],
  },
  ACCEPTED: {
    SERVING: ['seller'],
    CANCELED: ['buyer'],
  },
  SERVING: {
    COMPLETED: ['buyer', 'seller'],
    CANCELED: ['buyer'],
  },
}

/**
 * Moving to `PRICED` is the seller quoting, so `finalPrice` is required there
 * and forbidden-in-effect everywhere else (the API ignores it after `ACCEPTED`).
 * This is the only transition the UI collects an amount for.
 */
export function requiresPrice(next: RequestStatus): boolean {
  return next === 'PRICED'
}

/**
 * The mirror of `requiresPrice`: moving back to `REQUESTED` is the buyer turning
 * a quote down, and it is the one transition that carries a `customerNote` —
 * their chance to restate the job before the seller quotes again. The note is
 * optional there and ignored everywhere else.
 */
export function acceptsNote(next: RequestStatus): boolean {
  return next === 'REQUESTED'
}

/** Spanish button label for moving a request *to* the given status. */
export const REQUEST_ACTION_LABEL: Record<RequestStatus, string> = {
  REQUESTED: 'Rechazar precio',
  PRICED: 'Fijar precio',
  ACCEPTED: 'Aceptar precio',
  SERVING: 'Iniciar servicio',
  COMPLETED: 'Marcar completado',
  REJECTED: 'Rechazar solicitud',
  CANCELED: 'Cancelar',
}

/** Statuses the given role may move `status` to, in display order. */
export function allowedTransitions(
  status: RequestStatus,
  role: RequestRole,
): RequestStatus[] {
  const edges = TRANSITIONS[status]
  if (!edges) return []
  return (Object.keys(edges) as RequestStatus[]).filter((next) =>
    edges[next]?.includes(role),
  )
}

/** Who the request is waiting on, for the "what happens next" line. */
export function waitingOn(status: RequestStatus): RequestRole | 'both' | null {
  switch (status) {
    case 'REQUESTED':
    case 'ACCEPTED':
      return 'seller'
    case 'PRICED':
      return 'buyer'
    case 'SERVING':
      return 'both'
    default:
      return null
  }
}
