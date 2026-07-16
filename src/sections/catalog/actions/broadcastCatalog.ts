import { api, ApiError } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockBroadcastCatalog } from '@/mocks'

/**
 * Result of sending a catalog "Call to Action" announcement.
 * The endpoint is `/broadcast` for historical reasons — it is the CTA feature.
 */
export type BroadcastResult =
  | { ok: true }
  /** Daily allowance already used. `availableAt` is an ISO 8601 UTC timestamp. */
  | { ok: false; reason: 'cooldown'; availableAt: string }
  /** Message missing/empty or `itemId` does not belong to this catalog. */
  | { ok: false; reason: 'invalid'; message: string }
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'error'; message: string }

/** Fallback cooldown window when the server does not return `availableAt` (24h). */
function inTwentyFourHours(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Send a Call to Action to every subscriber of the owner's catalog.
 * Allowed once per 24h per catalog (rolling window, enforced server-side).
 */
export async function broadcastCatalog(
  catalogId: string,
  message: string,
  itemId?: string | null,
): Promise<BroadcastResult> {
  if (IS_DEV_STAGE) return mockBroadcastCatalog(catalogId, message)

  try {
    await api<{ message: string }>(`/catalog/${catalogId}/broadcast`, {
      method: 'POST',
      body: { message, itemId: itemId ?? null },
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { availableAt?: string } | undefined
      switch (err.status) {
        case 429:
          return { ok: false, reason: 'cooldown', availableAt: body?.availableAt ?? inTwentyFourHours() }
        case 400:
          return { ok: false, reason: 'invalid', message: err.message }
        case 401:
          return { ok: false, reason: 'unauthenticated' }
        case 403:
          return { ok: false, reason: 'forbidden' }
      }
    }
    return { ok: false, reason: 'error', message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
