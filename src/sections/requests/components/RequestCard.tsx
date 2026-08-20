import { ChevronRight } from 'lucide-react'
import { ITEM_TYPE_BAR } from '@/components/ItemTypeChip'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RequestStatusBadge } from './RequestStatusBadge'
import { formatRequestPrice } from './formatRequestPrice'
import { requestSubheader } from './requestSubheader'
import type { RequestRole, ServiceRequestRow } from '../types'

type Props = {
  row: ServiceRequestRow
  /** Which side the user is on — decides who the sub-header names. */
  role: RequestRole
  onSelect: (row: ServiceRequestRow) => void
}

/**
 * A request in the Pedidos feed. Deliberately spare: the service, the other
 * party, where it stands, and the price. The buyer's brief is *not* previewed
 * here — it is long-form and belongs in the detail dialog, where it is the
 * seller's pricing context rather than a clipped line of noise in a list.
 */
export function RequestCard({ row, role, onSelect }: Props) {
  const subheader = requestSubheader(row, role)
  return (
    <button
      onClick={() => onSelect(row)}
      aria-label={`${row.serviceName}, ${subheader}, del ${formatDate(row.dateCreated)}`}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 pb-5 text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Item-type footer, purple for a service — see TransactionCard for the
          green half of the pair. Decorative; the text already says what it is. */}
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0 bottom-0 h-1.5', ITEM_TYPE_BAR.service)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-base font-semibold">{row.serviceName}</p>
        <p className="truncate text-sm text-muted-foreground">{subheader}</p>
        <div className="mt-1 flex items-center gap-2">
          <RequestStatusBadge status={row.status} />
          <time dateTime={row.dateCreated} className="text-xs text-muted-foreground">
            {formatDate(row.dateCreated)}
          </time>
        </div>
        <p className="text-base font-bold text-primary">{formatRequestPrice(row.finalPrice)}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </button>
  )
}
