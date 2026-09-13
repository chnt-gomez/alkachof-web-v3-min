import { cn } from '@/lib/utils'
import type { TransactionStatus } from '../types'
import { STATUS_META } from './statusMeta'

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
