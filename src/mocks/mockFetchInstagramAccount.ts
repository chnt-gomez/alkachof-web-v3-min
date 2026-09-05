import type { InstagramAccount } from '@/sections/catalog/actions/fetchInstagramAccount'
import { mockInstagramStatus } from './mockInstagramStore'

export function mockFetchInstagramAccount(): Promise<InstagramAccount> {
  const status = mockInstagramStatus()
  const connected = status === 'CONNECTED'
  return Promise.resolve({
    connected,
    status,
    phylloAccountId: connected ? '44554e73-5879-4764-a37c-fa3a47e25c2a' : null,
    platformUsername: connected ? 'la_tienda_de_ana' : null,
    lastSyncedAt: connected ? new Date().toISOString() : null,
  })
}
