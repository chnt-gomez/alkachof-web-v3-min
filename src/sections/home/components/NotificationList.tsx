import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import {
  markNotificationSeen,
  notificationLink,
  type Notification,
} from '../actions/fetchNotifications'

type Props = { notifications: Notification[] }

export function NotificationList({ notifications }: Props) {
  // Local copy so clicks can optimistically flip `seenOn` and drop stale rows
  // without waiting for the parent section to refetch.
  const [items, setItems] = useState(notifications)
  useEffect(() => setItems(notifications), [notifications])

  async function handleSeen(id: string) {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, seenOn: true } : n)))
    try {
      const updated = await markNotificationSeen(id)
      setItems((prev) => prev.map((n) => (n._id === id ? updated : n)))
    } catch (err) {
      // 404 → the notification no longer exists; drop it from the feed.
      if (err instanceof ApiError && err.status === 404) {
        setItems((prev) => prev.filter((n) => n._id !== id))
      }
      // Other failures leave the optimistic seen state in place.
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nada por el momento
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((notification) => (
        <li key={notification._id}>
          <NotificationRow notification={notification} onSeen={handleSeen} />
        </li>
      ))}
    </ul>
  )
}

function NotificationRow({
  notification,
  onSeen,
}: {
  notification: Notification
  onSeen: (id: string) => void
}) {
  const unread = !notification.seenOn
  const isBroadcast =
    notification.metadata.type === 'ITEM' || notification.metadata.type === 'CATALOG'
  const Icon = isBroadcast ? Megaphone : Bell
  const link = notificationLink(notification)

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 shadow-sm',
        unread ? 'border-primary/30 bg-primary/5' : 'bg-card',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 text-sm', unread && 'font-semibold')}>
            {notification.message}
          </span>
          {unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="No leída" />
          )}
        </span>
        <time dateTime={notification.createdOn} className="text-xs text-muted-foreground">
          {formatRelative(notification.createdOn)}
        </time>
      </span>
    </div>
  )

  // Deep link comes from `metadata` (§4 of the blueprint). Unknown types yield a
  // non-clickable row. Clicking a linkable notification also marks it as seen.
  if (link) {
    return (
      <Link
        to={link}
        onClick={() => onSeen(notification._id)}
        className="block rounded-2xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </Link>
    )
  }

  return content
}

/** Relative time in Spanish ("hace 2h"), falling back to a date for old items. */
function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}
