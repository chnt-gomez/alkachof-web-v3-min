import { api, ApiError } from '@/lib/api'

export type EnrollResult =
  | { ok: true }
  /** 400 — the attestation checkbox was not ticked. Unreachable from this UI. */
  | { ok: false; reason: 'attestationRequired' }
  /** 400 — the account changed while it was being selected. Search again. */
  | { ok: false; reason: 'mismatch' }
  /** 404 — the handle no longer resolves. */
  | { ok: false; reason: 'notFound' }
  /**
   * 422 — the account is private. **Not retryable with the same account**: the
   * seller must change something on Instagram first.
   */
  | { ok: false; reason: 'private' }
  /** 409 — already enrolled, probably in another tab. Go straight to the feed. */
  | { ok: false; reason: 'alreadyEnrolled' }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'error'; message: string }

/**
 * Links the selected Instagram account to this seller — **permanently**.
 *
 * There is no endpoint to switch or unlink. That is the guard that keeps the
 * feature from becoming a way to read arbitrary Instagram accounts, so the UI
 * must have confirmed the choice before calling this.
 *
 * Sends `attested: true` and never the attestation text: the server owns the
 * sentence and records the version it displayed.
 */
export async function enrollInstagram(
  profileId: string,
  alias: string,
): Promise<EnrollResult> {
  try {
    await api('/instagram/enroll', {
      method: 'POST',
      body: { profileId, alias, attested: true },
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError) {
      switch (err.status) {
        case 409:
          return { ok: false, reason: 'alreadyEnrolled' }
        case 422:
          return { ok: false, reason: 'private' }
        case 404:
          return { ok: false, reason: 'notFound' }
        case 502:
          return { ok: false, reason: 'unavailable' }
        case 400:
          return {
            ok: false,
            reason: /confirm/i.test(err.message) ? 'attestationRequired' : 'mismatch',
          }
      }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
