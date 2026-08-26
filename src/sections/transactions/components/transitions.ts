import type { TransactionRole, TransactionStatus } from '../types'

/**
 * Frontend mirror of the backend `TRANSITIONS` map (transactionService.js).
 * Given a current status and the caller's role, it returns the statuses the
 * caller may move the transaction to via `POST /transaction/:id/status`.
 *
 * The buyer may confirm receipt (DELIVERED) from any non-terminal status. REJECTED,
 * DELIVERED and RETURNED are terminal. RETURNED is orphaned (no inbound edges).
 * The backend remains the source of truth; this only decides which action buttons
 * to render.
 */
const TRANSITIONS: Partial<
  Record<TransactionStatus, Partial<Record<TransactionStatus, TransactionRole[]>>>
> = {
  STARTED: {
    PROCESSING: ['seller'],
    REJECTED: ['seller'],
    DELIVERED: ['buyer'],
  },
  PROCESSING: {
    'READY-FOR-PICKUP': ['seller'],
    'EN-ROUTE': ['seller'],
    DELIVERED: ['buyer'],
  },
  'READY-FOR-PICKUP': {
    DELIVERED: ['buyer'],
  },
  'EN-ROUTE': {
    DELIVERED: ['buyer'],
  },
}

/** Spanish button label for moving a transaction *to* the given status. */
export const TRANSITION_ACTION_LABEL: Record<TransactionStatus, string> = {
  STARTED: 'Reiniciar',
  PROCESSING: 'Marcar en proceso',
  'READY-FOR-PICKUP': 'Marcar listo para recoger',
  'EN-ROUTE': 'Marcar en camino',
  DELIVERED: 'Confirmar recepción',
  REJECTED: 'Rechazar',
  RETURNED: 'Marcar devuelto',
}

/** Statuses the given role may transition to from `status`, in display order. */
export function allowedTransitions(
  status: TransactionStatus,
  role: TransactionRole,
): TransactionStatus[] {
  const edges = TRANSITIONS[status]
  if (!edges) return []
  return (Object.keys(edges) as TransactionStatus[]).filter((next) =>
    edges[next]?.includes(role),
  )
}
