import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchUserSummaries } from '@/mocks'
import type { UserSummary } from '../types'

/** Public display summary as returned by `GET /profile/summaries`. */
type ProfileSummary = {
  userId: string
  alias: string
  profilePictureUrl: string
}

/**
 * Resolve display info (name, avatar) for a set of user ids, keyed by id.
 *
 * Real branch calls `GET /profile/summaries` (batch, public alias + picture);
 * dev stage returns friendly seeded names. Users the server does not know, or
 * who have not set an alias, fall back to a neutral 'Usuario' so the UI never
 * shows a raw id or a blank title — but a party who set their alias is shown it,
 * which is what drives the chat title (each side sees the counterparty's name).
 */
export async function fetchUserSummaries(
  userIds: string[],
): Promise<Record<string, UserSummary>> {
  if (IS_DEV_STAGE) return mockFetchUserSummaries(userIds)

  const ids = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)))
  if (ids.length === 0) return {}

  const { summaries } = await api<{ summaries: ProfileSummary[] }>(
    `/profile/summaries?userIds=${encodeURIComponent(ids.join(','))}`,
  )

  const out: Record<string, UserSummary> = {}
  for (const s of summaries) {
    const alias = s.alias?.trim()
    out[s.userId] = {
      userId: s.userId,
      alias: alias || 'Usuario',
      avatarUrl: s.profilePictureUrl || undefined,
    }
  }
  // Guarantee every requested id has an entry (server omits users with no profile).
  for (const id of ids) {
    if (!out[id]) out[id] = { userId: id, alias: 'Usuario' }
  }
  return out
}
