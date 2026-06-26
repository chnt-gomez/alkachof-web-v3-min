import { cn } from '@/lib/utils'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}
