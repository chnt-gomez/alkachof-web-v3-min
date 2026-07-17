import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockFetchNotifications, mockMarkNotificationSeen } from '@/mocks'

/**
 * What kind of entity a notification points at. Treat this as an **open set**:
 * a future backend release may add a type this build does not know, so always
 * fall through to a non-clickable notification rather than crashing.
 * Only `ITEM` and `CATALOG` are emitted today (by catalog broadcasts).
 */
export type NotificationMetadataType = 'ITEM' | 'USER' | 'CATALOG' | 'TRANSACTION'

export type NotificationMetadata = {
  /** Id of the linked entity — combined with `type` to build the deep link. */
  id: string
  type: NotificationMetadataType
}

export type Notification = {
  /** Notification id — use for "mark as seen". */
  _id: string
  /** The recipient (always the caller). */
  userId: string
  /** Display-ready text, already composed server-side. Render as-is. */
  message: string
  metadata: NotificationMetadata
  /** UTC ISO-8601 timestamp of creation. */
  createdOn: string
  /** `false` = unread (show the unread indicator), `true` = seen. */
  seenOn: boolean
}

/** Newest-first. The server does not sort, so we sort client-side. */
function sortByCreatedDesc(notifications: Notification[]): Notification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
  )
}

/**
 * Build the client route a notification points at, from `metadata`. Returns
 * `null` for unknown types so the caller renders a non-clickable row.
 */
export function notificationLink({ metadata }: Notification): string | null {
  switch (metadata.type) {
    case 'ITEM':
      return `/product/${metadata.id}`
    case 'CATALOG':
      return `/catalog/${metadata.id}`
    case 'TRANSACTION':
      return '/transactions'
    case 'USER':
      return '/profile'
    default:
      return null
  }
}

/** Number of unread notifications — derived client-side (no count endpoint). */
export function unreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.seenOn).length
}

/** Notifications from the last 30 days for the logged-in user, newest-first. */
export async function fetchNotifications(): Promise<Notification[]> {
  if (IS_DEV_STAGE) return sortByCreatedDesc(await mockFetchNotifications())
  const data = await api<{ notifications: Notification[] }>('/notification/recent')
  return sortByCreatedDesc(data.notifications)
}

/** Full notification history for the logged-in user, newest-first. */
export async function fetchAllNotifications(): Promise<Notification[]> {
  if (IS_DEV_STAGE) return sortByCreatedDesc(await mockFetchNotifications())
  const data = await api<{ notifications: Notification[] }>('/notification/all')
  return sortByCreatedDesc(data.notifications)
}

/**
 * Mark a single notification as seen. Idempotent server-side; returns the
 * updated notification (`seenOn: true`). Only the owner may mark their own.
 */
export async function markNotificationSeen(id: string): Promise<Notification> {
  if (IS_DEV_STAGE) return mockMarkNotificationSeen(id)
  const data = await api<{ notification: Notification }>(`/notification/${id}/seen`, {
    method: 'POST',
  })
  return data.notification
}
