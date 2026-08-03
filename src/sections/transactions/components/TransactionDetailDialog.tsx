import { useCallback, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { useAsyncSection } from '@/sections/home/hooks/useAsyncSection'
import { formatDate, formatPrice } from '@/lib/format'
import { fetchTransactionPurchases } from '../actions/fetchTransactionPurchases'
import { updateTransactionStatus } from '../actions/updateTransactionStatus'
import { StatusBadge } from './StatusBadge'
import { allowedTransitions, TRANSITION_ACTION_LABEL } from './transitions'
import type { TransactionRole, TransactionStatus, TransactionSummary } from '../types'

type Props = {
  transaction: TransactionSummary
  role: TransactionRole
  /** Called after a successful status change so the list can reflect it. */
  onUpdated: (id: string, status: TransactionStatus) => void
  onClose: () => void
}

export function TransactionDetailDialog({ transaction, role, onUpdated, onClose }: Props) {
  const load = useCallback(
    () => fetchTransactionPurchases(transaction.id),
    [transaction.id],
  )
  const { status, data, reload } = useAsyncSection(load)

  // Track status locally so the badge and action buttons update in place after
  // a change, without closing the dialog or refetching the line items.
  const [currentStatus, setCurrentStatus] = useState<TransactionStatus>(transaction.status)
  const [pending, setPending] = useState<TransactionStatus | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Seller-only for now; buyer-driven transitions are a separate effort.
  const nextStatuses = role === 'seller' ? allowedTransitions(currentStatus, role) : []

  const changeStatus = useCallback(
    async (next: TransactionStatus) => {
      setPending(next)
      setActionError(null)
      try {
        const updated = await updateTransactionStatus(transaction.id, next)
        setCurrentStatus(updated.status)
        onUpdated(transaction.id, updated.status)
      } catch (err) {
        // The backend returns 500 for a disallowed transition (e.g. the list
        // went stale); surface a friendly nudge to refresh rather than a crash.
        setActionError(
          err instanceof ApiError && err.status === 500
            ? 'Este cambio ya no es válido; actualiza la lista.'
            : 'No pudimos actualizar el pedido. Inténtalo de nuevo.',
        )
      } finally {
        setPending(null)
      }
    },
    [transaction.id, onUpdated],
  )

  return (
    <Dialog onClose={onClose} ariaLabel="Detalle del pedido" title="Detalle del pedido">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={currentStatus} />
          <time dateTime={transaction.dateCreated} className="text-xs text-muted-foreground">
            {formatDate(transaction.dateCreated)}
          </time>
        </div>

        {status === 'loading' && (
          <div
            className="h-24 animate-pulse rounded-xl bg-muted"
            aria-busy="true"
            aria-label="Cargando artículos"
          />
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
          >
            <p className="text-sm text-destructive">No pudimos cargar los artículos.</p>
            <Button size="sm" variant="outline" onClick={reload}>
              Reintentar
            </Button>
          </div>
        )}

        {status === 'ready' && data && (
          <ul className="flex flex-col gap-3">
            {data.map((line) => (
              <li key={line.id} className="flex items-start gap-3">
                <img
                  src={line.item.imgPath}
                  alt={line.item.name}
                  className="w-16 shrink-0 rounded-lg object-contain"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-medium">{line.item.name}</p>
                  <p className="text-xs text-muted-foreground">Cantidad: {line.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-primary">
                  {formatPrice(line.totalPrice)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatPrice(transaction.totalAmount)}
          </span>
        </div>

        {nextStatuses.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-sm font-medium text-muted-foreground">Actualizar estado</span>
            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === 'REJECTED' || next === 'RETURNED' ? 'destructive' : 'default'}
                  disabled={pending !== null}
                  onClick={() => changeStatus(next)}
                >
                  {pending === next ? 'Actualizando...' : TRANSITION_ACTION_LABEL[next]}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
