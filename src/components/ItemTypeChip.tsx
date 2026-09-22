import { isService, type ItemType } from '@/lib/item'
import { cn } from '@/lib/utils'

/**
 * Accent class per item type, for surfaces that already know which kind they
 * are showing — the bar under a Pedidos card, where a product order and a
 * service request are different components entirely.
 *
 * Violeta de sello is the signature colour (products); azul marks services.
 * Both are theme tokens, so the pairing is defined once in `index.css`.
 */
export const ITEM_TYPE_BAR = {
  product: 'bg-product',
  service: 'bg-service',
} as const

type Props = {
  /** Only the type is read, so an `Item`, a `CartLine` or a bare `{ type }` all fit. */
  item: { type?: ItemType }
  className?: string
}

/**
 * Labels an item as Producto or Servicio, in that type's colour.
 *
 * Both types are labelled, not just services: an unlabelled card only reads as
 * "a product" once you know services are the ones that get a tag, which is
 * knowledge a first-time visitor does not have.
 */
export function ItemTypeChip({ item, className }: Props) {
  const service = isService(item)
  return (
    <span
      className={cn(
        'folio self-start rounded-sm border px-1.5 py-0.5 uppercase',
        service
          ? 'border-service-foreground bg-service-soft text-service-foreground'
          : 'border-product-foreground bg-product-soft text-product-foreground',
        className,
      )}
    >
      {service ? 'Servicio' : 'Producto'}
    </span>
  )
}
