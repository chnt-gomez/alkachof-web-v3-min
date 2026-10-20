import { cn } from '@/lib/utils'
import { ITEM_PLACEHOLDER_SRC, PLACEHOLDER_BG } from '@/lib/placeholders'

type Props = {
  /** Absent when the seller has not uploaded one — that renders the placeholder. */
  src?: string
  /** The item's name. Dropped when the placeholder renders — see below. */
  alt: string
  className?: string
  /**
   * Applied on top of `className` only when the placeholder renders. The slots
   * that give an item image the full column width use it to cap the
   * placeholder's height, since a square stand-in would otherwise push the
   * name, the price and the buttons below the fold.
   */
  placeholderClassName?: string
}

/**
 * A product's or service's image, with the paper-bag placeholder when the
 * seller has not set one.
 *
 * Only the `<img>` — every slot around it is sized by its own call site, which
 * is why there is no wrapper here: the same item renders in a 64px row, a 80px
 * picker tile and a full-width dialog, and those are not one component's
 * business. The background is set on the element itself, so it fills whatever
 * letterboxing `object-contain` leaves inside that slot.
 *
 * The placeholder's alt is **empty**. It is decorative: every one of these
 * slots renders the item's name as adjacent text, so announcing it again —
 * twenty-five times down an unfilled catalog — would be noise, and announcing
 * the name over artwork the seller did not choose would be a lie.
 */
export function ItemImage({ src, alt, className, placeholderClassName }: Props) {
  const placeholder = !src

  return (
    <img
      src={src || ITEM_PLACEHOLDER_SRC}
      alt={placeholder ? '' : alt}
      loading="lazy"
      decoding="async"
      style={placeholder ? { backgroundColor: PLACEHOLDER_BG } : undefined}
      className={cn(className, placeholder && placeholderClassName)}
    />
  )
}
