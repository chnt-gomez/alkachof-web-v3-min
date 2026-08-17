import type { ProfileSummary } from '@/sections/transactions/actions/fetchProfileSummaries'
import { getProfileSummaries } from './mockTransactionStore'

export function mockFetchProfileSummaries(
  userIds: string[],
): Promise<Record<string, ProfileSummary>> {
  return Promise.resolve(getProfileSummaries(userIds))
}
