import { api, ApiError } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockCreatePhylloConnectToken } from '@/mocks'
import type { PhylloEnvironment } from '@/lib/phylloConnect'

export type PhylloConnectToken = {
  /** Short-lived SDK token. Mint a new one every time — never cache it. */
  sdkToken: string
  phylloUserId: string
  /**
   * Instagram's work-platform id, sent so it lives in one place. Pass it
   * straight to the SDK; do not hardcode a copy in the client.
   */
  workPlatformId: string
  expiresAt: string
  /** Not sent today; honoured if the API starts reporting it. */
  environment?: PhylloEnvironment
}

export type ConnectTokenResult =
  | { ok: true; token: PhylloConnectToken }
  /** 502 — Phyllo unreachable or the API has no Phyllo credentials. Retryable. */
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'error'; message: string }

/** Mints the token the Phyllo Connect SDK needs. Called per connect attempt. */
export async function createPhylloConnectToken(): Promise<ConnectTokenResult> {
  if (IS_DEV_STAGE) return mockCreatePhylloConnectToken()

  try {
    const data = await api<PhylloConnectToken & { message: string }>('/phyllo/connect-token', {
      method: 'POST',
    })
    return {
      ok: true,
      token: {
        sdkToken: data.sdkToken,
        phylloUserId: data.phylloUserId,
        workPlatformId: data.workPlatformId,
        expiresAt: data.expiresAt,
        environment: data.environment,
      },
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 502) return { ok: false, reason: 'unavailable' }
      if (err.status === 401) return { ok: false, reason: 'unauthenticated' }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
