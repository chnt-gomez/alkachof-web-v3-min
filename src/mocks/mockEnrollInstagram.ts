import type { EnrollResult } from '@/sections/catalog/actions/enrollInstagram'
import {
  mockInstagramCandidates,
  mockInstagramEnrolled,
  mockMarkInstagramEnrolled,
} from './mockInstagramStore'

/**
 * Mirrors the API's commit checks: a private account is refused rather than
 * enrolled, and a second call is answered rather than switching the account.
 */
export function mockEnrollInstagram(profileId: string, alias: string): Promise<EnrollResult> {
  if (mockInstagramEnrolled()) {
    return Promise.resolve({ ok: false, reason: 'alreadyEnrolled' })
  }

  const candidate = mockInstagramCandidates(alias).find((c) => c.profileId === profileId)
  if (!candidate) {
    return Promise.resolve({ ok: false, reason: 'notFound' })
  }
  if (candidate.isPrivate) {
    return Promise.resolve({ ok: false, reason: 'private' })
  }

  mockMarkInstagramEnrolled()
  return Promise.resolve({ ok: true })
}
