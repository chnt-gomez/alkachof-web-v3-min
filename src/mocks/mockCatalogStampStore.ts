/**
 * Dev-stage mirror of the API's per-catalog freshness stamp.
 *
 * A mock that always returned the same string would make the whole gate
 * untestable by hand — the client would never see a change and never invalidate.
 * So every mock mutation that would move the stamp on the server bumps it here
 * too, and the dev stage exercises the real invalidation path.
 *
 * In-memory, like the other mock stores: it resets on reload.
 */

/** What the API answers for a catalog nobody has touched. Not an error. */
export const EPOCH = '1970-01-01T00:00:00.000Z'

const stamps = new Map<string, string>()

export function readCatalogStamp(catalogId: string): string {
  return stamps.get(catalogId) ?? EPOCH
}

/** Registers a catalog at the epoch without moving it, so `bumpAllCatalogStamps` can find it. */
export function touchCatalogStamp(catalogId: string): void {
  if (!stamps.has(catalogId)) stamps.set(catalogId, EPOCH)
}

export function bumpCatalogStamp(catalogId: string): void {
  stamps.set(catalogId, new Date().toISOString())
}

/**
 * For mutations whose mock signature does not carry a catalog id — `mockUpdateItem`
 * and `mockDeleteItem` take only an item id. Bumping every stamp we have handed
 * out is a dev-stage simplification: it can mark an unrelated catalog as changed,
 * which costs one refetch in dev and nothing in production, where the API stamps
 * exactly the right row.
 */
export function bumpAllCatalogStamps(): void {
  const now = new Date().toISOString()
  for (const key of stamps.keys()) stamps.set(key, now)
}
