import logoUrl from '@/assets/alkachof-logo.svg'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * The official logo beside the wordmark.
 *
 * The mark is the artwork alone — no violeta tile and no ink keyline behind it.
 * The logo carries its own palette on a transparent ground, and boxing it would
 * frame a drawing that is already a finished mark.
 *
 * The art is 1140×1018, so only the height is set and the width follows from the
 * viewBox. Pinning both would squash it (same reason product images are never
 * given a fixed height).
 *
 * `alt=""` is deliberate: the wordmark next to it already says "Alkachof", and
 * every link wrapping this carries its own `aria-label`. A second reading of the
 * brand name would just be noise in a screen reader.
 */
export function BrandMark({ size = 'sm', className }: BrandMarkProps) {
  const isLarge = size === 'lg'

  return (
    <span className={cn('inline-flex items-center', isLarge ? 'gap-3' : 'gap-2', className)}>
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className={cn('w-auto object-contain', isLarge ? 'h-14' : 'h-9')}
      />
      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          isLarge ? 'text-3xl' : 'text-lg'
        )}
      >
        Alkachof
      </span>
    </span>
  )
}
