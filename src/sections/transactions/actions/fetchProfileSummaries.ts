import { api } from '@/lib/api'

/** Public user summary as returned by `GET /profile/summaries`. */
export type ProfileSummary = {
  userId: string
  /** The user's display name. Never empty here — blank aliases are omitted. */
  alias: string
  profilePictureUrl?: string
}

/** Max ids the batch endpoint accepts per call (extras beyond this are dropped). */
const MAX_BATCH = 100

/**
 * Resolve display names for a set of user ids, keyed by id.
 *
 * Calls `GET /profile/summaries` (batch alias + picture). Used on the seller
 * view to label a row with the buyer's name. Ids are de-duplicated and chunked
 * to the endpoint's 100-id cap. Users the server can't resolve (deleted profile) and
 * those who never set an alias are **omitted** — the caller supplies a generic
 * fallback for those misses, so never assume every requested id comes back.
 */
export async function fetchProfileSummaries(
  userIds: string[],
): Promise<Record<string, ProfileSummary>> {
  const ids = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)))
  if (ids.length === 0) return {}

  const out: Record<string, ProfileSummary> = {}
  for (let i = 0; i < ids.length; i += MAX_BATCH) {
    const chunk = ids.slice(i, i + MAX_BATCH)
    const { summaries } = await api<{ summaries: ProfileSummary[] }>(
      `/profile/summaries?userIds=${encodeURIComponent(chunk.join(','))}`,
    )
    for (const s of summaries) {
      const alias = s.alias?.trim()
      if (alias) {
        out[s.userId] = {
          userId: s.userId,
          alias,
          profilePictureUrl: s.profilePictureUrl || undefined,
        }
      }
    }
  }
  return out
}
