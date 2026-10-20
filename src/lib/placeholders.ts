/**
 * The stand-in artwork shown where a seller has not uploaded an image. These
 * are fallbacks and nothing else: a catalog or item that *has* an image always
 * renders that image, at every size, never one of these.
 *
 * Both files live in `public/` rather than `src/assets/` on purpose — one
 * stable url the browser fetches once and every surface shares, instead of a
 * hashed copy per build. They are small (34 KB and 12 KB of WebP), because a
 * list of 25 unfilled boxes shows the item one 25 times.
 */

/** The shopfront, for a catalog with no image. 1024×765. */
export const CATALOG_PLACEHOLDER_SRC = '/catalog-placeholder.webp'

/** The paper bag, for a product or service with no image. 768×768. */
export const ITEM_PLACEHOLDER_SRC = '/item-placeholder.webp'

/**
 * The background both pieces of artwork are drawn on, sampled from them (they
 * agree to within a few counts per channel). Painted behind a placeholder so
 * the letterboxing a non-square slot leaves is invisible, and so there is no
 * flash of a different colour while the file downloads.
 *
 * It is deliberately not `--color-card`: that token is close but cooler, and at
 * thumbnail size the seam shows. Re-sample this if the artwork is replaced.
 */
export const PLACEHOLDER_BG = '#fdedda'
