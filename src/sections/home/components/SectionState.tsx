import { Button } from '@/components/ui/button'

/** Placeholder while a home section loads. */
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="h-24 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label={label} />
  )
}

/** A section that failed, with its own retry so the rest of Home stays usable. */
export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
