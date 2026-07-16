import { Link } from 'react-router-dom'
import { Megaphone, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '../actions/fetchNotifications'

type Props = { notifications: Notification[] }

export function NotificationList({ notifications }: Props) {
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
          <NotificationRow notification={notification} />
        </li>
      ))}
    </ul>
  )
}

function NotificationRow({ notification }: { notification: Notification }) {
  const unread = notification.notificationStatus === 'unread'
  const isCatalogUpdate = notification.notificationType === 'catalog-update'
  const Icon = isCatalogUpdate ? Megaphone : Bell

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
          <span className={cn('truncate text-sm', unread && 'font-semibold')}>
            {notification.notificationTitle}
          </span>
          {unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="No leída" />
          )}
        </span>
        <span className="text-sm text-muted-foreground">{notification.notificationDescription}</span>
        <time dateTime={notification.notificationDate} className="text-xs text-muted-foreground">
          {formatDate(notification.notificationDate)}
        </time>
      </span>
    </div>
  )

  // For catalog-update announcements the associated id is (for now) treated as a
  // catalog id — deep-link to the public catalog view. See the §3 caveat in
  // docs.AnnounceCatalog.frontend.md: item-vs-catalog links are a later enhancement.
  if (isCatalogUpdate && notification.notificationAssociatedId) {
    return (
      <Link
        to={`/catalog/${notification.notificationAssociatedId}`}
        className="block rounded-2xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </Link>
    )
  }

  return content
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
}
