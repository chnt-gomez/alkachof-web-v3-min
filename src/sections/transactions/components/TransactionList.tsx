import { TransactionCard } from './TransactionCard'
import type { TransactionSummary } from '../types'

type Props = {
  transactions: TransactionSummary[]
  onSelect: (transaction: TransactionSummary) => void
  /** Resolves each row's title (shop name for buyers, buyer name for sellers). */
  headerFor: (transaction: TransactionSummary) => string
  /** Id of the transaction to visually pulse (notification deep-link). */
  highlightedId?: string | null
  /** Registers each card's element so a deep-link can scroll it into view. */
  registerCard?: (id: string, el: HTMLElement | null) => void
}

export function TransactionList({
  transactions,
  onSelect,
  headerFor,
  highlightedId,
  registerCard,
}: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          ref={(el) => registerCard?.(transaction.id, el)}
          className={highlightedId === transaction.id ? 'transaction-highlight' : undefined}
        >
          <TransactionCard
            transaction={transaction}
            header={headerFor(transaction)}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}
