/** Format an integer amount of cents (MXN) for display, e.g. 45900 -> "$459.00". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
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
