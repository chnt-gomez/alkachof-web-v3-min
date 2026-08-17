import type { Subscription } from '@/sections/publicCatalog/actions/fetchUserSubscriptions'

// Dev-stage fixture: the mock user follows no catalogs yet, so the public
// catalog button starts in the "Suscribirme" state and can be toggled.
export function mockFetchUserSubscriptions(): Promise<Subscription[]> {
  return Promise.resolve([])
}
