import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchNotifications } from '@/mocks'

export type Notification = {
  _id: string
  message: string
  createdAt: string
  read: boolean
}

export async function fetchNotifications(): Promise<Notification[]> {
  if (IS_DEV_STAGE) return mockFetchNotifications()
  const data = await api<{ notifications: Notification[] }>('/notifications')
  return data.notifications
}
