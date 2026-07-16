import type { BroadcastResult } from '@/sections/catalog/actions/broadcastCatalog'

const COOLDOWN_MS = 24 * 60 * 60 * 1000

/** Last successful send per catalog id — simulates the server's 24h rolling window. */
const lastSentAt = new Map<string, number>()

export function mockBroadcastCatalog(catalogId: string, message: string): Promise<BroadcastResult> {
  if (message.trim().length === 0) {
    return Promise.resolve({ ok: false, reason: 'invalid', message: 'El mensaje no puede estar vacío.' })
  }

  const previous = lastSentAt.get(catalogId)
  if (previous !== undefined && Date.now() - previous < COOLDOWN_MS) {
    return Promise.resolve({
      ok: false,
      reason: 'cooldown',
      availableAt: new Date(previous + COOLDOWN_MS).toISOString(),
    })
  }

  lastSentAt.set(catalogId, Date.now())
  return Promise.resolve({ ok: true })
}
