import type { Notification } from '@/sections/home/actions/fetchNotifications'
import { pick, randomId, randomInt } from './random'

// Catalog broadcasts are the only source of notifications today. The server
// composes `message` as "{catalogAlias}: {ownerMessage}" and sets metadata.type
// to ITEM (broadcast referenced an item) or CATALOG (whole-catalog broadcast).
const BROADCASTS: { alias: string; message: string }[] = [
  { alias: 'Rebozos Oaxaca', message: '¡Nuevos rebozos de temporada ya disponibles! 🧣' },
  { alias: 'Dulces La Abuela', message: 'Esta semana: 2x1 en cajetas artesanales.' },
  { alias: 'Joyería Filigrana', message: 'Acaban de llegar aretes nuevos, ¡corre por los tuyos!' },
  { alias: 'Café de Altura', message: 'Ya está aquí la cosecha nueva de café de Oaxaca ☕' },
]

export function mockFetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = Array.from({ length: randomInt(0, 4) }, () => {
    const broadcast = pick(BROADCASTS)
    return {
      _id: randomId(),
      userId: randomId(),
      message: `${broadcast.alias}: ${broadcast.message}`,
      metadata: {
        id: randomId(),
        type: pick(['ITEM', 'CATALOG'] as const),
      },
      createdOn: new Date(Date.now() - randomInt(1, 72) * 3_600_000).toISOString(),
      seenOn: Math.random() < 0.5,
    }
  })
  return Promise.resolve(notifications)
}
