import type { Notification } from '@/sections/notifications/actions/fetchNotifications'
import { listRequests } from './mockRequestStore'
import { getTransactionRecords } from './mockTransactionStore'
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

// Order notifications point at a specific row in the "Pedidos" tab. Product
// orders and service requests share that page, so they share the URL shape —
// only the message differs. The role is the *recipient's* side of the deal.
const TRANSACTION_MESSAGES: { message: string; role: 'buyer' | 'seller' }[] = [
  { message: 'Tu pedido cambió a "En camino". 🚚', role: 'buyer' },
  { message: 'Recibiste una nueva venta, ¡prepárala!', role: 'seller' },
  { message: 'Tu pedido fue entregado. ¡Gracias por tu compra!', role: 'buyer' },
]

const REQUEST_MESSAGES: { message: string; role: 'buyer' | 'seller' }[] = [
  { message: 'Tienes una nueva solicitud de servicio. Ponle precio para continuar.', role: 'seller' },
  { message: 'Tu solicitud ya tiene precio. Revísala para aceptarla.', role: 'buyer' },
  { message: 'Tu solicitud fue aceptada.', role: 'seller' },
  { message: 'El servicio fue completado. ¡Gracias!', role: 'buyer' },
]

// Informational notifications carry no navigation target.
const INFORMATIONAL = [
  'Tu cuenta ha sido revisada y aprobada.',
  'Actualizamos nuestros términos y condiciones.',
]

type NavKind = 'catalog' | 'product' | 'transaction' | 'request' | 'informational'

/**
 * The id of a row that actually exists in the Pedidos mocks for `role`, so a
 * dev-stage notification deep-link lands on a real card instead of highlighting
 * nothing. Falls back to a random id when the seed has no row for that role.
 */
function orderTargetId(kind: 'transaction' | 'request', role: 'buyer' | 'seller'): string {
  const ids =
    kind === 'request'
      ? listRequests(role).map((r) => r.id)
      : getTransactionRecords()
          .filter((r) => r.role === role)
          .map((r) => r.summary.id)
  return ids.length > 0 ? pick(ids) : randomId()
}

/** Mirrors `navigationUrlService.js` in the API — that file owns these shapes. */
function buildMetadata(kind: NavKind, role: 'buyer' | 'seller'): { navigationUrl: string | null } {
  switch (kind) {
    case 'catalog':
      return { navigationUrl: `/catalog/${randomId()}` }
    case 'product':
      return { navigationUrl: `/catalog/${randomId()}?product=${randomId()}` }
    case 'transaction':
    case 'request':
      return {
        navigationUrl: `/transactions?highlight=${orderTargetId(kind, role)}&role=${role}`,
      }
    case 'informational':
      return { navigationUrl: null }
  }
}

export function mockFetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = Array.from({ length: randomInt(0, 5) }, () => {
    const kind = pick(['catalog', 'product', 'transaction', 'request', 'informational'] as const)
    const broadcast = pick(BROADCASTS)
    const order = pick(kind === 'request' ? REQUEST_MESSAGES : TRANSACTION_MESSAGES)
    const message =
      kind === 'informational'
        ? pick(INFORMATIONAL)
        : kind === 'transaction' || kind === 'request'
          ? order.message
          : `${broadcast.alias}: ${broadcast.message}`
    return {
      _id: randomId(),
      userId: randomId(),
      message,
      metadata: buildMetadata(kind, order.role),
      createdOn: new Date(Date.now() - randomInt(1, 72) * 3_600_000).toISOString(),
      seenOn: Math.random() < 0.5,
    }
  })
  return Promise.resolve(notifications)
}
