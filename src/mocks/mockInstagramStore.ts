import type {
  InstagramPost,
  InstagramPostFormat,
} from '@/sections/catalog/actions/fetchInstagramPosts'
import type { InstagramAccountStatus } from '@/sections/catalog/actions/fetchInstagramAccount'
import { randomInt } from './random'

/**
 * Shared dev-stage state for the Phyllo endpoints, so the connect screen, the
 * feed and an import agree with each other across calls within one session.
 *
 * Connecting is faked at the token step: `openPhylloConnect` is a no-op in dev
 * stage (it never loads Phyllo's script), so minting a connect token is the
 * only signal the seller went through the modal.
 */

const CAPTIONS: Array<{ title: string; description: string }> = [
  { title: 'Blusa de lino', description: 'Blusa de lino\nDisponible en 3 colores' },
  { title: 'Aretes de latón', description: 'Aretes de latón\nHechos a mano en Oaxaca' },
  { title: 'Rebozo bordado', description: 'Rebozo bordado\nTelar de cintura, pieza única' },
  { title: 'Bolsa de palma', description: 'Bolsa de palma\nTejida en Guerrero' },
  { title: 'Taza de barro negro', description: 'Taza de barro negro\nSan Bartolo Coyotepec' },
  { title: 'Collar de chaquira', description: 'Collar de chaquira\nArte huichol' },
  { title: 'Huipil de manta', description: 'Huipil de manta\nBordado a mano' },
  { title: 'Vela de cera de abeja', description: 'Vela de cera de abeja\nAroma de lavanda' },
  { title: 'Jabón artesanal', description: 'Jabón artesanal\nAvena y miel' },
  { title: 'Sombrero de palma', description: 'Sombrero de palma\nTalla única' },
  { title: 'Servilletas bordadas', description: 'Servilletas bordadas\nJuego de cuatro' },
  { title: 'Cesto de mimbre', description: 'Cesto de mimbre\nIdeal para la ropa' },
  { title: 'Detrás de cámaras', description: 'Detrás de cámaras del taller de esta semana 🎥' },
  { title: 'Gracias por su apoyo', description: 'Gracias por su apoyo este mes ❤️' },
]

/** A couple of non-image posts so the "solo fotos" path is exercised in dev. */
const FORMATS: InstagramPostFormat[] = [
  'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE',
  'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE',
  'VIDEO', 'TEXT',
]

let status: InstagramAccountStatus = 'PENDING'
let posts: InstagramPost[] | null = null

function buildFeed(): InstagramPost[] {
  const now = Date.now()
  return CAPTIONS.map((caption, index) => ({
    contentId: `ig_content_${index + 1}`,
    title: caption.title,
    description: caption.description,
    format: FORMATS[index] ?? 'IMAGE',
    url: `https://www.instagram.com/p/mock${index + 1}/`,
    publishedAt: new Date(now - index * 36 * 60 * 60 * 1000).toISOString(),
    // Stands in for Phyllo's signed CDN link. Regenerated on every fetch, the
    // same way a real refetch mints fresh urls.
    previewUrl: `https://picsum.photos/seed/ig${index + 1}/600/750`,
    // A couple already landed, so the "ya importado" state shows up on load.
    imported: index === 2 || index === 7,
    itemId: index === 2 || index === 7 ? `item_ig_${index + 1}` : null,
  }))
}

/** Called by the connect-token mock — dev stage treats that as a full connect. */
export function mockMarkInstagramConnected(): void {
  status = 'CONNECTED'
}

export function mockInstagramStatus(): InstagramAccountStatus {
  return status
}

export function mockInstagramPosts(): InstagramPost[] {
  if (!posts) posts = buildFeed()
  return posts
}

/** Flips a post to imported so a second attempt is refused, as in production. */
export function mockMarkPostImported(contentId: string, itemId: string): void {
  const feed = mockInstagramPosts()
  const post = feed.find((p) => p.contentId === contentId)
  if (post) {
    post.imported = true
    post.itemId = itemId
  }
}

/** Dev-stage stand-in for a preview link that expired between fetch and import. */
export function mockPreviewExpired(): boolean {
  return randomInt(0, 9) === 0
}
