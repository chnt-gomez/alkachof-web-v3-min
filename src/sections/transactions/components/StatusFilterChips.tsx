import { cn } from '@/lib/utils'
import { ORDER_STATUS_FILTERS } from './orderStatusFilter'

type Props = {
  /** The selected status label, or null for "Todos". */
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Status chips for the Pedidos feed. They filter by status *label* rather than
 * by enum, because the list mixes product orders and service requests whose
 * enums are disjoint — see `orderStatusFilter.ts`.
 *
 * **Not mounted in this MVP.** `TransactionsPage` stopped rendering it: a user
 * holds one or two rows at a time, so the chips filtered nothing and ate a third
 * of a phone screen. Kept whole, along with the feed state that drives it
 * (`statusLabel`/`setStatusLabel` on `useOrdersFeed`), for when real accounts
 * carry enough history to need it — putting it back is one line in the page.
 */
export function StatusFilterChips({ value, onChange }: Props) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      <Chip active={value === null} onClick={() => onChange(null)}>
        Todos
      </Chip>
      {ORDER_STATUS_FILTERS.map((filter) => (
        <Chip
          key={filter.label}
          active={value === filter.label}
          onClick={() => onChange(filter.label)}
        >
          {filter.label}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
