import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/utils'

export interface ProgressButtonProps extends ButtonProps {
  /** True while the action is in flight: the button fills left-to-right. */
  pending: boolean
  /** Replaces the label while pending — a verb in progress ("Procesando…"). */
  pendingLabel?: string
  /** Accessible name of the bar: what is being processed ("Procesando pedido"). */
  progressLabel: string
}

/**
 * The standard button for a non-idempotent action (see `lib/pendingAction.ts`).
 * While pending it turns into a progress bar filling over `MIN_PENDING_MS` and
 * stops accepting taps, so the operation reads as work in progress rather than
 * as a button that did nothing.
 *
 * Pair it with `withMinDuration()` on the call itself — the fill animates for a
 * fixed second, so a request that resolves sooner must still be held that long
 * or the bar vanishes mid-sweep.
 *
 * The bar is drawn in the button's own text colour, so it suits any filled
 * variant (`default`, `destructive`) — on `outline` or `ghost` it would need a
 * different treatment.
 */
export function ProgressButton({
  pending,
  pendingLabel = 'Procesando…',
  progressLabel,
  className,
  disabled,
  children,
  ...props
}: ProgressButtonProps) {
  return (
    <Button
      disabled={disabled || pending}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {pending && (
        <span
          role="progressbar"
          aria-label={progressLabel}
          className="absolute inset-y-0 left-0 z-0 bg-current/25 animate-progress-fill"
        />
      )}
      <span className="relative z-10">{pending ? pendingLabel : children}</span>
    </Button>
  )
}
