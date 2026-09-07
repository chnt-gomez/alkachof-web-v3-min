import type { SearchProfilesResult } from '@/sections/catalog/actions/searchInstagramProfiles'
import {
  MOCK_ATTESTATION,
  mockInstagramCandidates,
  mockInstagramEnrolled,
} from './mockInstagramStore'

/**
 * Mirrors the API's guard: search closes permanently once the seller is
 * enrolled, so an enrolled dev session gets the same 409 a real one would.
 */
export function mockSearchInstagramProfiles(query: string): Promise<SearchProfilesResult> {
  if (mockInstagramEnrolled()) {
    return Promise.resolve({ ok: false, reason: 'alreadyEnrolled' })
  }
  if (!query.trim()) {
    return Promise.resolve({ ok: false, reason: 'queryRequired' })
  }
  return Promise.resolve({
    ok: true,
    profiles: mockInstagramCandidates(query),
    attestation: MOCK_ATTESTATION,
  })
}
