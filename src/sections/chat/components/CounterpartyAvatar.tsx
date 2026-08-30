import type { UserSummary } from '../types'
import { resolveMediaUrl } from '@/lib/mediaUrl'

/** Round avatar for a counterparty — photo when available, else initial. */
export function CounterpartyAvatar({
  summary,
  size = 44,
}: {
  summary: UserSummary | undefined
  size?: number
}) {
  const alias = summary?.alias ?? 'Usuario'
  const dimension = { width: size, height: size }

  if (summary?.avatarUrl) {
    return (
      <img
        src={resolveMediaUrl(summary.avatarUrl)}
        alt={alias}
        style={dimension}
        className="shrink-0 rounded-full border object-cover"
      />
    )
  }

  return (
    <span
      style={dimension}
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
      aria-hidden="true"
    >
      {alias.charAt(0).toUpperCase()}
    </span>
  )
}
