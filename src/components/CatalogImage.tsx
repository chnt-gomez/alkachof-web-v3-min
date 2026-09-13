import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type HeroProps = {
  /** Absent when the owner has not uploaded one — that renders the placeholder. */
  src?: string
  alt: string
  /** Extra line under the placeholder label; the owner views use it as a call to action. */
  hint?: string
}

/**
 * The catalog's presentation image as shown on the gradient jumbotrons (owner
 * header and public shop header). Colors assume a `primary` background.
 *
 * The image is the seller's main marketing surface, so it renders at its natural
 * aspect ratio — `object-contain` + `w-full`, no fixed height, never cropped.
 * Only the empty placeholder takes a fixed ratio, since it has nothing to crop.
 */
export function CatalogHeroImage({ src, alt, hint }: HeroProps) {
  if (src) {
    return (
      <div className="overflow-hidden rounded-2xl bg-primary-foreground/10">
        <img src={src} alt={alt} className="w-full object-contain" />
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label="Este catálogo aún no tiene imagen"
      className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/70"
    >
      <ImageIcon size={28} aria-hidden="true" />
      <p className="text-xs font-medium">Imagen del catálogo</p>
      {hint && <p className="px-6 text-center text-[11px]">{hint}</p>}
    </div>
  )
}

type ThumbProps = {
  src?: string
  /** Icon shown when there is no image — keeps each list's existing visual identity. */
  fallback: React.ReactNode
  /** 'sm' for list rows; 'lg' for the owner's own card, where it is the focal point. */
  size?: 'sm' | 'lg'
}

const THUMB_SIZES = {
  sm: 'h-11 w-11 rounded-xl',
  lg: 'h-20 w-20 rounded-2xl',
} as const

/**
 * Square catalog image for list/card rows. Decorative: every card already names
 * the catalog in its own link label, so the img carries an empty alt.
 */
export function CatalogThumb({ src, fallback, size = 'sm' }: ThumbProps) {
  if (!src) return <>{fallback}</>
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-muted',
        THUMB_SIZES[size],
      )}
    >
      <img src={src} alt="" className="h-full w-full object-contain" />
    </span>
  )
}
