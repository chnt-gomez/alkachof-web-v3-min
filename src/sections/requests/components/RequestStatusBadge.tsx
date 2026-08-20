import { cn } from '@/lib/utils'
import type { RequestStatus } from '../types'
import { REQUEST_STATUS_META } from './statusMeta'

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS_META[status]
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
