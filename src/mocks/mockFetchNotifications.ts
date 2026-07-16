import type { Notification } from '@/sections/home/actions/fetchNotifications'
import { pick, randomId, randomInt } from './random'

// Catalog "Call to Action" announcements — the primary source of notifications.
const CTAS: { title: string; description: string }[] = [
  { title: 'Rebozos Oaxaca', description: '¡Nuevos rebozos de temporada ya disponibles! 🧣' },
  { title: 'Dulces La Abuela', description: 'Esta semana: 2x1 en cajetas artesanales.' },
  { title: 'Joyería Filigrana', description: 'Acaban de llegar aretes nuevos, ¡corre por los tuyos!' },
  { title: 'Café de Altura', description: 'Ya está aquí la cosecha nueva de café de Oaxaca ☕' },
]

export function mockFetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = Array.from({ length: randomInt(0, 4) }, () => {
    const cta = pick(CTAS)
    return {
      _id: randomId(),
      userId: randomId(),
      notificationType: 'catalog-update',
      notificationAssociatedId: randomId(),
      notificationTitle: cta.title,
      notificationDescription: cta.description,
      notificationStatus: Math.random() < 0.5 ? 'unread' : 'read',
      notificationDate: new Date(Date.now() - randomInt(1, 72) * 3_600_000).toISOString(),
    }
  })
  return Promise.resolve(notifications)
}
