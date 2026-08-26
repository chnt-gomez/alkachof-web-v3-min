import { createContext } from 'react'
import type { Notification } from './actions/fetchNotifications'

export type NotificationsStatus = 'loading' | 'ready' | 'error'

export type NotificationsState = {
  /** Newest-first. Empty until the first fetch resolves. */
  notifications: Notification[]
  status: NotificationsStatus
  /** Number of unread notifications — drives the bell badge. */
  unseen: number
  /** Refetch from REST, showing the loading state (user-initiated retry). */
  reload: () => void
  /** Optimistically mark one notification as seen and persist it. */
  markSeen: (id: string) => Promise<void>
  /**
   * Optimistically drop one notification and delete it server-side. Permanent —
   * there is no undo. A failure puts the row back where it was.
   */
  remove: (id: string) => Promise<void>
}

export const NotificationsContext = createContext<NotificationsState | null>(null)
