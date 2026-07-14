import { TransactionCard } from './TransactionCard'
import type { TransactionSummary } from '../types'

type Props = {
  transactions: TransactionSummary[]
  onSelect: (transaction: TransactionSummary) => void
}

export function TransactionList({ transactions, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <TransactionCard transaction={transaction} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  )
}
