import { api } from '@/lib/api'
import { IS_DEV_STAGE } from '@/lib/stage'
import { mockDeleteNotification, mockFetchNotifications, mockMarkNotificationSeen } from '@/mocks'

export type NotificationMetadata = {
  /**
   * A **relative in-app path** to navigate to on click (always starts with `/`),
   * or `null` for an informational notification with no navigation target (e.g.
   * an admin message). The API composes this server-side — the client navigates
   * to it as-is and never builds routes from entity ids.
   */
  navigationUrl: string | null
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
 * The in-app path a notification navigates to, or `null` when it's informational
 * (render a non-clickable message). The API sends a ready-to-use relative path in
 * `metadata.navigationUrl`; we only defend against a non-relative value — the API
 * rejects absolute and protocol-relative (`//host`) URLs at write time, so this
 * should never trigger.
 */
export function notificationLink({ metadata }: Notification): string | null {
  const url = metadata.navigationUrl
  if (!url || !url.startsWith('/') || url.startsWith('//')) return null
  return url
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

/**
 * Delete a single notification — permanently, server-side (there is no undo and
 * no trash). Only the owner may delete their own; a notification that is already
 * gone answers 404, which the caller can treat as success.
 */
export async function deleteNotification(id: string): Promise<void> {
  if (IS_DEV_STAGE) return mockDeleteNotification(id)
  await api<{ message: string }>(`/notification/${id}/delete`, { method: 'POST' })
}
