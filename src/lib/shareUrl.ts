// Root URL of the public-facing app, used to build shareable links. Each
// deployment sets VITE_PUBLIC_APP_URL to its real domain; until that's wired,
// we fall back to a placeholder (the reserved `.example` TLD makes it obvious).
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://alkachof.example'

/** Absolute, shareable URL for a catalog's public page. */
export function catalogShareUrl(catalogId: string): string {
  return `${PUBLIC_APP_URL.replace(/\/$/, '')}/catalog/${catalogId}`
}

/**
 * Absolute, shareable URL that deep-links to a specific product within a
 * catalog. Opening it lands on the catalog page, which scrolls to and
 * highlights the product (see CatalogItemList's `?product=` handling).
 */
export function productShareUrl(catalogId: string, productId: string): string {
  return `${catalogShareUrl(catalogId)}?product=${encodeURIComponent(productId)}`
}
