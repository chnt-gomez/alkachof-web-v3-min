import type { TransactionStatus } from '../types'

export const STATUS_META: Record<TransactionStatus, { label: string; className: string }> = {
  STARTED: { label: 'Iniciado', className: 'bg-secondary text-secondary-foreground' },
  PROCESSING: { label: 'En proceso', className: 'bg-amber-100 text-amber-800' },
  'READY-FOR-PICKUP': { label: 'Listo para recoger', className: 'bg-blue-100 text-blue-800' },
  'EN-ROUTE': { label: 'En camino', className: 'bg-blue-100 text-blue-800' },
  DELIVERED: { label: 'Entregado', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive' },
  RETURNED: { label: 'Devuelto', className: 'bg-muted text-muted-foreground' },
}

/** Statuses in display order (used by the filter chips). */
export const TRANSACTION_STATUSES = Object.keys(STATUS_META) as TransactionStatus[]

export function statusLabel(status: TransactionStatus): string {
  return STATUS_META[status].label
}
