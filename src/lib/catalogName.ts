/**
 * What to call a catalog whose owner has not named it.
 *
 * **Neither string is ever written.** They are display fallbacks, substituted
 * at render time only. The alias field stays empty in the database until the
 * seller types something, which is what keeps "has this seller named their
 * shop?" an answerable question — a default persisted into the row would be
 * indistinguishable from a seller who chose that name, and no later migration
 * could tell them apart. The one place a seller could save it by accident is
 * the editor's name field, so that input seeds from the raw alias (`''`) and
 * keeps its own example placeholder; it must never seed from here.
 *
 * There are two strings because the name appears in two voices. The owner's own
 * screens address them directly, so the shop is "mine"; everywhere a visitor,
 * a buyer or a passer-by reads it, the first person would be someone else's.
 */

/** The owner's own screens: Home's "Mi catálogo" card, the catalog editor header. */
export const OWNER_CATALOG_NAME = 'Mi Catálogo en Alkachof'

/** Everywhere else: the public shop, invitations, the map, Pedidos, share text. */
export const PUBLIC_CATALOG_NAME = 'Catálogo en Alkachof'

/**
 * An alias is "missing" when the API has no name for this catalog — null,
 * undefined, or blank. Whitespace counts as blank: a seller who saved a space
 * has not named their shop, and rendering one would leave a hole where the
 * title goes.
 */
function named(alias: string | null | undefined): string | undefined {
  return alias?.trim() || undefined
}

/** The catalog's name as its **owner** should see it. */
export function ownerCatalogName(alias: string | null | undefined): string {
  return named(alias) ?? OWNER_CATALOG_NAME
}

/** The catalog's name as **anyone else** should see it. */
export function publicCatalogName(alias: string | null | undefined): string {
  return named(alias) ?? PUBLIC_CATALOG_NAME
}
