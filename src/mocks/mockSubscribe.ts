import type { Subscription } from '@/sections/publicCatalog/actions/fetchUserSubscriptions'
import { randomId } from './random'

export function mockSubscribe(catalogId: string): Promise<Subscription> {
  return Promise.resolve({
    _id: `subscription_${randomId()}`,
    userId: `user_${randomId()}`,
    catalogId,
  })
}
