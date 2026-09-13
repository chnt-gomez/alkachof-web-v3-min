import { Link } from 'react-router-dom'
import { Megaphone, Bell, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format'
import {
  notificationLink,
  type Notification,
} from '@/sections/notifications/actions/fetchNotifications'

type Props = {
  notifications: Notification[]
  /** Called with the notification id when a linkable row is clicked. */
  onSeen: (id: string) => void
  /** Called with the notification id when its trash button is pressed. */
  onDelete: (id: string) => void
}

export function NotificationList({ notifications, onSeen, onDelete }: Props) {
  if (notifications.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nada por el momento
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((notification) => (
        <li key={notification._id}>
          <NotificationRow notification={notification} onSeen={onSeen} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

function NotificationRow({
  notification,
  onSeen,
  onDelete,
}: {
  notification: Notification
  onSeen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const unread = !notification.seenOn
  const link = notificationLink(notification)
  // Navigable notifications are catalog/product broadcasts; the ones without a
  // target are informational (e.g. admin messages).
  const Icon = link ? Megaphone : Bell

  const body = (
    <span className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left">
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
    </span>
  )

  // The clickable area and the trash button are siblings, never nested — a
  // button inside a link is invalid and swallows the row's own click.
  const interactiveArea = 'flex min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'

  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-2xl border shadow-sm transition-shadow',
        unread ? 'border-primary/30 bg-primary/5' : 'bg-card',
        link && 'hover:shadow-md',
      )}
    >
      {/* The API ships a ready-to-use relative path in `metadata.navigationUrl`.
          A linkable notification navigates and marks itself seen on click. */}
      {link ? (
        <Link to={link} onClick={() => onSeen(notification._id)} className={interactiveArea}>
          {body}
        </Link>
      ) : unread ? (
        // Informational notifications (no navigation target) don't navigate, but
        // an unread one can still be dismissed — tapping it marks it seen.
        <button
          type="button"
          onClick={() => onSeen(notification._id)}
          aria-label="Marcar como leída"
          className={interactiveArea}
        >
          {body}
        </button>
      ) : (
        // Seen and informational: a static message with no interactive affordance
        // other than the trash button.
        body
      )}

      <button
        type="button"
        onClick={() => onDelete(notification._id)}
        aria-label={`Eliminar notificación: ${notification.message}`}
        className="flex shrink-0 items-center px-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
