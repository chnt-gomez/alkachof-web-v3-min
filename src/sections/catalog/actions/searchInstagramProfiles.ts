import { api, ApiError } from '@/lib/api'

/** One row in the enrollment picker. Profile metadata only — never posts. */
export type InstagramProfileCandidate = {
  profileId: string
  alias: string
  fullName: string
  avatarUrl: string
  /** Not selectable: a private account cannot be read at all. */
  isPrivate: boolean
  isVerified: boolean
  postCount: number
}

/**
 * The ownership attestation, owned by the server.
 *
 * The client renders `template` with `placeholder` replaced by the selected
 * handle, and sends back only `attested: true`. It never composes or submits the
 * sentence itself — what gets stored has to be what was displayed, and the only
 * way to guarantee that is for both to come from the same source.
 */
export type AttestationCopy = {
  version: string
  template: string
  placeholder: string
}

export type SearchProfilesResult =
  | { ok: true; profiles: InstagramProfileCandidate[]; attestation: AttestationCopy }
  /** 409 — already enrolled. Search closes permanently once an account is linked. */
  | { ok: false; reason: 'alreadyEnrolled' }
  /** 400 — empty query. */
  | { ok: false; reason: 'queryRequired' }
  /** 502 — the scraper is unreachable. Retryable. */
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'error'; message: string }

/**
 * Finds candidate Instagram accounts for the enrollment picker.
 *
 * **This is the only endpoint that takes a handle**, and the API refuses it once
 * the seller is enrolled — so a seller gets one search session in the lifetime of
 * their account. It runs a scraper actor and takes seconds; show real progress.
 */
export async function searchInstagramProfiles(query: string): Promise<SearchProfilesResult> {
  try {
    const data = await api<{ profiles: InstagramProfileCandidate[]; attestation: AttestationCopy }>(
      `/instagram/search?q=${encodeURIComponent(query)}`,
    )
    return { ok: true, profiles: data.profiles ?? [], attestation: data.attestation }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) return { ok: false, reason: 'alreadyEnrolled' }
      if (err.status === 400) return { ok: false, reason: 'queryRequired' }
      if (err.status === 502) return { ok: false, reason: 'unavailable' }
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
