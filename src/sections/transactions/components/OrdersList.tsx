import { RequestCard } from '@/sections/requests/components/RequestCard'
import { TransactionCard } from './TransactionCard'
import type { OrderRow } from '../hooks/useOrdersFeed'
import type { TransactionRole, TransactionSummary } from '../types'
import type { ServiceRequestRow } from '@/sections/requests/types'

type Props = {
  rows: OrderRow[]
  /** The active role tab — both cards name the other party by it. */
  role: TransactionRole
  onSelectTransaction: (transaction: TransactionSummary) => void
  onSelectRequest: (request: ServiceRequestRow) => void
  /** Resolves a product order's title (shop name for buyers, buyer name for sellers). */
  headerFor: (transaction: TransactionSummary) => string
  /** Id of the row to visually pulse (notification deep-link). */
  highlightedId?: string | null
  /** Registers each card's element so a deep-link can scroll it into view. */
  registerCard?: (id: string, el: HTMLElement | null) => void
}

/**
 * The Pedidos feed. Product orders and service requests share the list and the
 * sort, but keep their own cards — they carry different data (item count and
 * total vs. the buyer's brief and a quoted price), so a single merged card
 * would show blanks for half the rows.
 */
export function OrdersList({
  rows,
  role,
  onSelectTransaction,
  onSelectRequest,
  headerFor,
  highlightedId,
  registerCard,
}: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={`${row.kind}-${row.id}`}
          ref={(el) => registerCard?.(row.id, el)}
          className={highlightedId === row.id ? 'transaction-highlight' : undefined}
        >
          {row.kind === 'transaction' ? (
            <TransactionCard
              transaction={row.transaction}
              header={headerFor(row.transaction)}
              role={role}
              onSelect={onSelectTransaction}
            />
          ) : (
            <RequestCard row={row.request} role={role} onSelect={onSelectRequest} />
          )}
        </li>
      ))}
    </ul>
  )
}
