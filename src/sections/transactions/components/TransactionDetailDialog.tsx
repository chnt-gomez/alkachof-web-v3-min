import { useCallback } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAsyncSection } from '@/sections/home/hooks/useAsyncSection'
import { formatDate, formatPrice } from '@/lib/format'
import { fetchTransactionPurchases } from '../actions/fetchTransactionPurchases'
import { StatusBadge } from './StatusBadge'
import type { TransactionSummary } from '../types'

type Props = {
  transaction: TransactionSummary
  onClose: () => void
}

export function TransactionDetailDialog({ transaction, onClose }: Props) {
  const load = useCallback(
    () => fetchTransactionPurchases(transaction.id),
    [transaction.id],
  )
  const { status, data, reload } = useAsyncSection(load)

  return (
    <Dialog onClose={onClose} ariaLabel="Detalle del pedido" title="Detalle del pedido">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={transaction.status} />
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
      </div>
    </Dialog>
  )
}
