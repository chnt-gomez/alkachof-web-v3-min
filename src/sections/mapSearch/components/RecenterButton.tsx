import { LocateFixed } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onClick: () => void
  /** A position request is in flight. */
  busy: boolean
}

/**
 * Back to the viewer's own position.
 *
 * It **never hides**, in any state: with a position known it is a pure map move,
 * and without one it asks again. A control that disappears when geolocation
 * fails leaves the user with no way to retry and no explanation.
 *
 * A thumb target over the map rather than a control in the header. Placement is
 * the page's job: it stacks this above the result card, so neither covers the
 * other and both clear Leaflet's attribution strip.
 */
export function RecenterButton({ onClick, busy }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Volver a mi ubicación"
      className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground disabled:opacity-60"
    >
      <LocateFixed size={22} className={cn(busy && 'animate-spin')} />
    </button>
  )
}
