/**
 * How many items one catalog may hold.
 *
 * Mirrors the API's `CONSTANTS.CATALOG.MAX_ITEMS` in
 * `alkachof-api/api/constants/constants.js` (hoisted there as
 * `MAX_CATALOG_ITEMS`, because the Instagram import batch is sized from the same
 * number). **Keep the two in step** — same arrangement as `imagePresets.ts`.
 *
 * The server is what enforces it: `catalogService.createItem` refuses the 26th
 * item with `Max items reached`. Everything here is courtesy — it exists so a
 * seller is told what fits *before* they pick, rather than after.
 */
export const MAX_CATALOG_ITEMS = 25

/**
 * How many more items this catalog can take. Never negative: a catalog can end
 * up over the cap (the limit changed, an admin wrote rows directly), and a
 * negative "you may add -2" is worse than a plain zero.
 */
export function remainingCatalogSlots(itemCount: number): number {
  return Math.max(0, MAX_CATALOG_ITEMS - itemCount)
}
