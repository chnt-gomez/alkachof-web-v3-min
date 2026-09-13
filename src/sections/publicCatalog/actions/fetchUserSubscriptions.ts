import { api } from '@/lib/api'

export type Subscription = {
  _id: string
  userId: string
  catalogId: string
}

export async function fetchUserSubscriptions(): Promise<Subscription[]> {
  const data = await api<{ subscriptions: Subscription[] }>('/subscription/user')
  return data.subscriptions
}
