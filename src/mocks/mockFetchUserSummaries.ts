import type { UserSummary } from '@/sections/chat/types'
import { getUserSummaries } from './mockChatStore'

export function mockFetchUserSummaries(
  userIds: string[],
): Promise<Record<string, UserSummary>> {
  return Promise.resolve(getUserSummaries(userIds))
}
