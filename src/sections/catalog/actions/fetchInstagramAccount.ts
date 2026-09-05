import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchInstagramAccount } from '@/mocks'

/**
 * Four genuinely different screens — never collapsed into a boolean.
 * `SESSION_EXPIRED` in particular must say *reconnect*: the seller already
 * linked the account once and being told to connect it reads as a bug.
 */
export type InstagramAccountStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'NOT_CONNECTED'
  | 'SESSION_EXPIRED'

export type InstagramAccount = {
  /** Convenience flag — true only for `CONNECTED`. Branch on `status`. */
  connected: boolean
  status: InstagramAccountStatus
  phylloAccountId: string | null
  platformUsername: string | null
  lastSyncedAt: string | null
}

/**
 * Read live from Phyllo rather than from a cached row, so this is what to poll
 * after the Connect modal closes.
 */
export async function fetchInstagramAccount(): Promise<InstagramAccount> {
  if (IS_DEV_STAGE) return mockFetchInstagramAccount()
  const data = await api<InstagramAccount & { message: string }>('/phyllo/account')
  return {
    connected: data.connected,
    status: data.status,
    phylloAccountId: data.phylloAccountId ?? null,
    platformUsername: data.platformUsername ?? null,
    lastSyncedAt: data.lastSyncedAt ?? null,
  }
}
