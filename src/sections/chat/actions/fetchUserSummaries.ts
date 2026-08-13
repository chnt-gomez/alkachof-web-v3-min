import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchUserSummaries } from '@/mocks'
import type { UserSummary } from '../types'

/**
 * Resolve display info (name, avatar) for a set of user ids, keyed by id.
 *
 * The chat API returns no counterparty names yet — an intentional MVP gap (see
 * `followup.ChatApi.md`). This function is the single seam where that gets
 * resolved: today the real branch returns a neutral id-derived placeholder (no
 * HTTP call, so no paired mock is required for it), and dev stage returns
 * friendly seeded names. When a batch profile-lookup endpoint lands, wire it
 * here and nothing else in the section changes.
 */
export async function fetchUserSummaries(
  userIds: string[],
): Promise<Record<string, UserSummary>> {
  if (IS_DEV_STAGE) return mockFetchUserSummaries(userIds)
  // TODO: replace with a real batch user/profile lookup once the API exposes one.
  return Object.fromEntries(
    userIds.map((userId) => [userId, { userId, alias: 'Usuario' } satisfies UserSummary]),
  )
}
