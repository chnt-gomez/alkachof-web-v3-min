import type { Notification } from '@/sections/notifications/actions/fetchNotifications'
import { pick, randomId, randomInt } from './random'

// Catalog broadcasts are the main source of notifications. The server composes
// `message` as "{catalogAlias}: {ownerMessage}" and ships a ready-to-use relative
// path in `metadata.navigationUrl` (or `null` for informational messages).
const BROADCASTS: { alias: string; message: string }[] = [
  { alias: 'Rebozos Oaxaca', message: '¡Nuevos rebozos de temporada ya disponibles! 🧣' },
  { alias: 'Dulces La Abuela', message: 'Esta semana: 2x1 en cajetas artesanales.' },
  { alias: 'Joyería Filigrana', message: 'Acaban de llegar aretes nuevos, ¡corre por los tuyos!' },
  { alias: 'Café de Altura', message: 'Ya está aquí la cosecha nueva de café de Oaxaca ☕' },
]

// Informational notifications carry no navigation target.
const INFORMATIONAL = [
  'Tu cuenta ha sido revisada y aprobada.',
  'Actualizamos nuestros términos y condiciones.',
]

type NavKind = 'catalog' | 'product' | 'informational'

function buildMetadata(kind: NavKind): { navigationUrl: string | null } {
  switch (kind) {
    case 'catalog':
      return { navigationUrl: `/catalog/${randomId()}` }
    case 'product':
      return { navigationUrl: `/catalog/${randomId()}?product=${randomId()}` }
    case 'informational':
      return { navigationUrl: null }
  }
}

export function mockFetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = Array.from({ length: randomInt(0, 4) }, () => {
    const kind = pick(['catalog', 'product', 'informational'] as const)
    const isInfo = kind === 'informational'
    const broadcast = pick(BROADCASTS)
    return {
      _id: randomId(),
      userId: randomId(),
      message: isInfo ? pick(INFORMATIONAL) : `${broadcast.alias}: ${broadcast.message}`,
      metadata: buildMetadata(kind),
      createdOn: new Date(Date.now() - randomInt(1, 72) * 3_600_000).toISOString(),
      seenOn: Math.random() < 0.5,
    }
  })
  return Promise.resolve(notifications)
}
