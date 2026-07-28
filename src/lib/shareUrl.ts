// Root URL of the public-facing app, used to build shareable links. Each
// deployment sets VITE_PUBLIC_APP_URL to its real domain; until that's wired,
// we fall back to a placeholder (the reserved `.example` TLD makes it obvious).
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://alkachof.example'

/** Absolute, shareable URL for a catalog's public page. */
export function catalogShareUrl(catalogId: string): string {
  return `${PUBLIC_APP_URL.replace(/\/$/, '')}/catalog/${catalogId}`
}
