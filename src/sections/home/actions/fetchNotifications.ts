import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchNotifications } from '@/mocks'

export type NotificationType = 'catalog-update' | 'message' | 'other'
export type NotificationStatus = 'unread' | 'read'

export type Notification = {
  _id: string
  userId: string
  notificationType: NotificationType
  /**
   * Target of the notification. For `catalog-update` this is either an item id
   * or a catalog id — the payload does not yet discriminate which, so treat it
   * as a catalog id for deep-linking (see docs.AnnounceCatalog.frontend.md §3).
   */
  notificationAssociatedId: string
  notificationTitle: string
  notificationDescription: string
  notificationStatus: NotificationStatus
  notificationDate: string
}

/** Notifications from the last 30 days for the logged-in user. */
export async function fetchNotifications(): Promise<Notification[]> {
  if (IS_DEV_STAGE) return mockFetchNotifications()
  const data = await api<{ notifications: Notification[] }>('/notification/recent')
  return data.notifications
}
