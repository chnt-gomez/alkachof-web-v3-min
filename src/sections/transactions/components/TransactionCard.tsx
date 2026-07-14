import { ChevronRight } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/format'
import { StatusBadge } from './StatusBadge'
import type { TransactionSummary } from '../types'

type Props = {
  transaction: TransactionSummary
  onSelect: (transaction: TransactionSummary) => void
}

export function TransactionCard({ transaction, onSelect }: Props) {
  const { itemCount } = transaction
  return (
    <button
      onClick={() => onSelect(transaction)}
      aria-label={`Pedido del ${formatDate(transaction.dateCreated)}`}
      className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={transaction.status} />
          <time dateTime={transaction.dateCreated} className="text-xs text-muted-foreground">
            {formatDate(transaction.dateCreated)}
          </time>
        </div>
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </p>
        <p className="text-base font-bold text-primary">{formatPrice(transaction.totalAmount)}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </button>
  )
}
