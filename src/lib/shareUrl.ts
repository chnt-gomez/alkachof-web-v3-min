// Root URL of the public-facing app, used to build shareable links. Each
// deployment sets VITE_PUBLIC_APP_URL to its real domain (.env.production for
// builds). The fallback is production on purpose: these urls get pasted into
// WhatsApp, so an unset var must never mint a link that only opens on the
// machine that generated it.
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://app.alkachof.mx'

/** Absolute, shareable URL for a catalog's public page. */
export function catalogShareUrl(catalogId: string): string {
  return `${PUBLIC_APP_URL.replace(/\/$/, '')}/join?catalogId=${catalogId}`
}

/**
 * Absolute, shareable URL that deep-links to a specific product within a
 * catalog. Opening it lands on the join page, which then navigates to the
 * catalog page and scrolls to the specified product.
 */
export function productShareUrl(catalogId: string, productId: string): string {
  return `${catalogShareUrl(catalogId)}&product=${encodeURIComponent(productId)}`
}
