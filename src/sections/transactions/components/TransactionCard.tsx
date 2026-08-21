import { ChevronRight } from 'lucide-react'
import { ITEM_TYPE_BAR } from '@/components/ItemTypeChip'
import { formatDate, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { TransactionRole, TransactionSummary } from '../types'

type Props = {
  transaction: TransactionSummary
  /** The other party: the shop name (buyer view) or the buyer name (seller view). */
  header: string
  /** Which side the user is on — decides how the title reads. */
  role: TransactionRole
  onSelect: (transaction: TransactionSummary) => void
}

/**
 * A product order in the Pedidos feed. On Ventas the title says whose order it
 * is ("Pedido de Ana Ramírez") rather than dropping a bare person's name at the
 * top of a card; on Compras the title is the shop, which already reads as a
 * place the user bought from.
 */
export function TransactionCard({ transaction, header, role, onSelect }: Props) {
  const { itemCount } = transaction
  const title = role === 'seller' ? `Pedido de ${header}` : header
  return (
    <button
      onClick={() => onSelect(transaction)}
      aria-label={`Pedido de ${header} del ${formatDate(transaction.dateCreated)}`}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 pb-5 text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Item-type footer: green marks a product order, purple a service
          request, so the two kinds are told apart at a glance in a mixed feed.
          Decorative — the card's text already says which it is. */}
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0 bottom-0 h-1.5', ITEM_TYPE_BAR.product)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-base font-semibold">{title}</p>
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
