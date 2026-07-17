import type { Notification } from '@/sections/home/actions/fetchNotifications'
import { randomId } from './random'

// Marking as seen is idempotent server-side and returns the updated notification
// with `seenOn: true`. There is no mock store, so echo a plausible notification
// carrying the requested id.
export function mockMarkNotificationSeen(id: string): Promise<Notification> {
  return Promise.resolve({
    _id: id,
    userId: randomId(),
    message: 'Rebozos Oaxaca: ¡Nuevos rebozos de temporada ya disponibles! 🧣',
    metadata: { id: randomId(), type: 'CATALOG' },
    createdOn: new Date().toISOString(),
    seenOn: true,
  })
}
