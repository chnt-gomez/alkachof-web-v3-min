import { cn } from '@/lib/utils'
import { CATALOG_PLACEHOLDER_SRC, PLACEHOLDER_BG } from '@/lib/placeholders'

/**
 * Kept distinct from the catalog's name: a screen reader hearing the alias here
 * would be told the shop has a photo of itself, which it does not. (The item
 * placeholder goes the other way — see `ItemImage` for why.)
 */
export const CATALOG_PLACEHOLDER_ALT = 'Este catálogo aún no tiene imagen'

type HeroProps = {
  /** Absent when the owner has not uploaded one — that renders the placeholder. */
  src?: string
  alt: string
  /** Line under the placeholder; the owner view uses it as a call to action. */
  hint?: string
}

/**
 * The catalog's presentation image as shown on the jumbotrons (owner header,
 * public shop header, invitation card).
 *
 * The image is the seller's main marketing surface, so it renders at its
 * natural aspect ratio — `object-contain` + `w-full`, no fixed height, never
 * cropped. The placeholder obeys the same rule, so a shop that later uploads a
 * tall image does not have the header jump to a different shape.
 */
export function CatalogHeroImage({ src, alt, hint }: HeroProps) {
  const placeholder = !src

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn('overflow-hidden rounded-xl border-2 border-ink', !placeholder && 'bg-muted')}
        style={placeholder ? { backgroundColor: PLACEHOLDER_BG } : undefined}
      >
        <img
          src={placeholder ? CATALOG_PLACEHOLDER_SRC : src}
          alt={placeholder ? CATALOG_PLACEHOLDER_ALT : alt}
          // Only the placeholder's dimensions are known ahead of the download,
          // so only it can reserve its height before the bytes arrive.
          width={placeholder ? 1024 : undefined}
          height={placeholder ? 765 : undefined}
          className="w-full object-contain"
        />
      </div>
      {placeholder && hint && (
        <p className="px-6 text-center text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

type ThumbProps = {
  src?: string
  /** 'sm' for list rows; 'lg' for the owner's own card, where it is the focal point. */
  size?: 'sm' | 'lg'
}

const THUMB_SIZES = {
  sm: 'h-11 w-11 rounded-xl',
  lg: 'h-20 w-20 rounded-2xl',
} as const

/**
 * Square catalog image for list/card rows. Decorative: every card already names
 * the catalog in its own link label, so the img carries an empty alt — including
 * the placeholder, which would otherwise announce "no image" on every blank row
 * of a list.
 */
export function CatalogThumb({ src, size = 'sm' }: ThumbProps) {
  const placeholder = !src

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden',
        !placeholder && 'bg-muted',
        THUMB_SIZES[size],
      )}
      style={placeholder ? { backgroundColor: PLACEHOLDER_BG } : undefined}
    >
      <img
        src={placeholder ? CATALOG_PLACEHOLDER_SRC : src}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    </span>
  )
}
