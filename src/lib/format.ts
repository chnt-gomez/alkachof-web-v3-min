import { isService, type ItemType } from './item'

/** Format an integer amount of cents (MXN) for display, e.g. 45900 -> "$459.00". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

/**
 * Display price for an item. Items always store a price, so a service with no
 * price set reads back as 0 — that means "not quoted yet", not "free", and the
 * real amount is agreed between buyer and seller. A service the seller *did*
 * price is shown normally, as a starting price.
 */
export function formatItemPrice(item: { price: number; type?: ItemType }): string {
  if (isService(item) && item.price === 0) return 'Precio a convenir'
  return formatPrice(item.price)
}

/** Format an ISO date string for display in es-MX, e.g. "14 de julio, 3:05 p.m.". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Relative time in Spanish ("hace 2 h"), falling back to a date for old items. */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

/**
 * A distance from the proximity search, in Spanish.
 *
 * The API rounds `distanceMeters` to 100 m deliberately (an exact distance from
 * three chosen origins reconstructs an exact doorstep), and `0` is its way of
 * saying "under 50 m" — never render it as "0 m". Nothing here implies a route:
 * these are approximate coordinates, not an address.
 */
export function formatDistance(meters: number): string {
  if (meters <= 0) return 'a menos de 50 m'
  if (meters < 1000) return `a ${meters} m`
  const km = meters / 1000
  return `a ${km.toLocaleString('es-MX', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}
