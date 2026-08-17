import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchUserSubscriptions } from '@/mocks'

export type Subscription = {
  _id: string
  userId: string
  catalogId: string
}

export async function fetchUserSubscriptions(): Promise<Subscription[]> {
  if (IS_DEV_STAGE) return mockFetchUserSubscriptions()
  const data = await api<{ subscriptions: Subscription[] }>('/subscription/user')
  return data.subscriptions
}
