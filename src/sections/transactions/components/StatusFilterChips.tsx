import { cn } from '@/lib/utils'
import type { TransactionStatus } from '../types'
import { TRANSACTION_STATUSES, statusLabel } from './statusMeta'

type Props = {
  value: TransactionStatus | null
  onChange: (value: TransactionStatus | null) => void
}

export function StatusFilterChips({ value, onChange }: Props) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      <Chip active={value === null} onClick={() => onChange(null)}>
        Todos
      </Chip>
      {TRANSACTION_STATUSES.map((s) => (
        <Chip key={s} active={value === s} onClick={() => onChange(s)}>
          {statusLabel(s)}
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
