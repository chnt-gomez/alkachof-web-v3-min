import { api } from '@/lib/api'

/** Public shop summary as returned by `GET /catalog/summaries`. */
export type CatalogSummary = {
  catalogId: string
  /** The shop's display name. Never empty here — blank aliases are omitted. */
  alias: string
}

/** Max ids the batch endpoint accepts per call (extras beyond this are dropped). */
const MAX_BATCH = 100

/**
 * Resolve shop names for a set of catalog ids, keyed by id.
 *
 * Real branch calls `GET /catalog/summaries` (batch shop-name lookup); dev
 * stage returns seeded shop names. Ids are de-duplicated and chunked to the
 * endpoint's 100-id cap. Catalogs the server can't resolve (deleted) and owners
 * who never set a name (empty alias) are **omitted** from the result — the
 * caller supplies a generic fallback for those misses, so never assume every
 * requested id comes back.
 */
export async function fetchCatalogSummaries(
  catalogIds: string[],
): Promise<Record<string, CatalogSummary>> {
  const ids = Array.from(new Set(catalogIds.map((id) => id.trim()).filter(Boolean)))
  if (ids.length === 0) return {}

  const out: Record<string, CatalogSummary> = {}
  for (let i = 0; i < ids.length; i += MAX_BATCH) {
    const chunk = ids.slice(i, i + MAX_BATCH)
    const { summaries } = await api<{ summaries: CatalogSummary[] }>(
      `/catalog/summaries?catalogIds=${encodeURIComponent(chunk.join(','))}`,
    )
    for (const s of summaries) {
      const alias = s.alias?.trim()
      if (alias) out[s.catalogId] = { catalogId: s.catalogId, alias }
    }
  }
  return out
}
