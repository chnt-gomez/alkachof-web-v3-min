import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/sections/auth/useAuth'
import { useToast } from '@/components/ui/useToast'
import {
  deleteNotification,
  fetchNotifications,
  markNotificationSeen,
  unreadCount,
  type Notification,
} from '../actions/fetchNotifications'
import { connectLiveSocket } from '../liveSocket'
import {
  NotificationsContext,
  type NotificationsState,
  type NotificationsStatus,
} from '../notificationsContextValue'

/**
 * App-wide notification store: holds the list REST is authoritative for and
 * layers the best-effort live socket on top. Mounted once (inside
 * `AuthProvider`); connects on login, disconnects on logout.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [status, setStatus] = useState<NotificationsStatus>('loading')

  // Silent re-sync: replaces the list without flashing the loading state, so
  // socket reconnects don't blank an already-rendered feed. A failure only
  // surfaces as an error before the first successful load.
  const syncFromServer = useCallback(async () => {
    try {
      const list = await fetchNotifications()
      setNotifications(list)
      setStatus('ready')
    } catch {
      setStatus((prev) => (prev === 'ready' ? prev : 'error'))
    }
  }, [])

  const reload = useCallback(() => {
    setStatus('loading')
    void syncFromServer()
  }, [syncFromServer])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setStatus('loading')
      return
    }
    // Fetch immediately rather than waiting for the socket handshake — the
    // socket is best-effort and REST must work even when it never connects.
    void syncFromServer()
    return connectLiveSocket({
      onConnect: syncFromServer,
      onNotification: (notification) => {
        setNotifications((prev) => [
          notification,
          ...prev.filter((n) => n._id !== notification._id),
        ])
        toast.success(notification.message)
      },
    })
  }, [isAuthenticated, syncFromServer, toast])

  const markSeen = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, seenOn: true } : n)))
    try {
      const updated = await markNotificationSeen(id)
      setNotifications((prev) => prev.map((n) => (n._id === id ? updated : n)))
    } catch (err) {
      // 404 → the notification no longer exists; drop it from the feed.
      if (err instanceof ApiError && err.status === 404) {
        setNotifications((prev) => prev.filter((n) => n._id !== id))
      }
      // Other failures leave the optimistic seen state in place.
    }
  }, [])

  const remove = useCallback(
    async (id: string) => {
      const index = notifications.findIndex((n) => n._id === id)
      if (index === -1) return
      const removed = notifications[index]
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      try {
        await deleteNotification(id)
      } catch (err) {
        // 404 → already gone server-side, so dropping it was right.
        if (err instanceof ApiError && err.status === 404) return
        // Anything else: the row is still there, so put it back where it was.
        setNotifications((prev) => {
          if (prev.some((n) => n._id === id)) return prev
          const next = [...prev]
          next.splice(index, 0, removed)
          return next
        })
        toast.error('No pudimos eliminar la notificación.')
      }
    },
    [notifications, toast],
  )

  const value = useMemo<NotificationsState>(
    () => ({
      notifications,
      status,
      unseen: unreadCount(notifications),
      reload,
      markSeen,
      remove,
    }),
    [notifications, status, reload, markSeen, remove],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
