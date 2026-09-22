import { cn } from '@/lib/utils'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/*
  A loading surface is an unstamped box already ruled on the card, waiting for
  its impression — not a ghost of the thing that is coming. It steps between
  two printed values rather than ramping opacity, because a fade is the one
  motion this world does not have. `animate-box-wait` was exactly that fade, and
  it was the first frame of every screen.
*/
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className={cn('animate-box-wait rounded-xl border-2 border-ink bg-muted', className)}
      {...props}
    />
  )
}
