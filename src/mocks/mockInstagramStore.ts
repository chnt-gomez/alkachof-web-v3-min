import type {
  InstagramPost,
  InstagramMediaType,
} from '@/sections/catalog/actions/fetchInstagramPosts'
import type {
  InstagramProfileCandidate,
  AttestationCopy,
} from '@/sections/catalog/actions/searchInstagramProfiles'
import { randomInt } from './random'

/**
 * Shared dev-stage state for the Instagram endpoints, so the enrollment flow,
 * the feed and an import agree with each other across calls within one session.
 *
 * Enrollment starts empty on purpose: the search → pick → attest wizard is the
 * part most worth exercising, and it is unreachable once a row exists. Reload the
 * page to start over — dev state is in-memory, like the real row is permanent.
 * The import cooldown resets on reload for the same reason; in production it
 * outlives the session by a week.
 */

const CAPTIONS: Array<{ caption: string }> = [
  { caption: 'Blusa de lino\nDisponible en 3 colores' },
  { caption: 'Aretes de latón\nHechos a mano en Oaxaca' },
  { caption: 'Rebozo bordado\nTelar de cintura, pieza única' },
  { caption: 'Bolsa de palma\nTejida en Guerrero' },
  { caption: 'Taza de barro negro\nSan Bartolo Coyotepec' },
  { caption: 'Collar de chaquira\nArte huichol' },
  { caption: 'Huipil de manta\nBordado a mano' },
  { caption: 'Vela de cera de abeja\nAroma de lavanda' },
  { caption: 'Jabón artesanal\nAvena y miel' },
  { caption: 'Sombrero de palma\nTalla única' },
  { caption: 'Servilletas bordadas\nJuego de cuatro' },
  { caption: 'Cesto de mimbre\nIdeal para la ropa' },
  { caption: 'Detrás de cámaras del taller de esta semana 🎥' },
  { caption: 'Gracias por su apoyo este mes ❤️' },
]

/** A couple of videos so the "solo fotos" path is exercised in dev. */
const MEDIA_TYPES: InstagramMediaType[] = [
  'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE',
  'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE', 'IMAGE',
  'VIDEO', 'VIDEO',
]

/**
 * The handles a dev session can resolve. Includes a private one so the picker's
 * disabled state and the private-account screen are both reachable — type
 * `tienda_ana_privada` to see them.
 */
const CANDIDATES: InstagramProfileCandidate[] = [
  {
    profileId: '17841400000001',
    alias: 'la_tienda_de_ana',
    fullName: 'La Tienda de Ana',
    avatarUrl: 'https://picsum.photos/seed/ana/120/120',
    isPrivate: false,
    isVerified: false,
    postCount: 14,
  },
  {
    profileId: '17841400000002',
    alias: 'la_tienda_de_ana_mx',
    fullName: 'La Tienda de Ana · Envíos',
    avatarUrl: 'https://picsum.photos/seed/anamx/120/120',
    isPrivate: false,
    isVerified: true,
    postCount: 87,
  },
  {
    profileId: '17841400000003',
    alias: 'tienda_ana_privada',
    fullName: 'Ana (privada)',
    avatarUrl: 'https://picsum.photos/seed/anapriv/120/120',
    isPrivate: true,
    isVerified: false,
    postCount: 0,
  },
]

export const MOCK_ATTESTATION: AttestationCopy = {
  version: '1.0',
  template:
    'Soy el dueño/a o administrador de la cuenta {instagram_account}. Entiendo que al ' +
    'importar contenido de Instagram de una cuenta que no sea de mi propiedad, estoy ' +
    'violando los términos y condiciones de Alkachof y mi cuenta podría ser suspendida.',
  placeholder: '{instagram_account}',
}

/**
 * The dev-stage mirror of `ig_details.nextAvailable`.
 *
 * Reading the feed is a billed scraper run in production, so the API lets a
 * seller do it once per cooldown and only a *successful* import moves the date.
 * Modelled here so the gated screens — the disabled catalog button and the
 * cooldown notice — are reachable in dev: import anything, and the next attempt
 * is refused exactly as it would be against the real API.
 */
export const MOCK_COOLDOWN_DAYS = 7

let enrolled = false
let posts: InstagramPost[] | null = null
/** null means "nothing is holding the seller", as it does in the API. */
let nextAvailable: string | null = null

function buildFeed(): InstagramPost[] {
  const now = Date.now()
  return CAPTIONS.map((entry, index) => ({
    externalPostId: `ig_post_${index + 1}`,
    caption: entry.caption,
    mediaType: MEDIA_TYPES[index] ?? 'IMAGE',
    permalink: `https://www.instagram.com/p/mock${index + 1}/`,
    publishedAt: new Date(now - index * 36 * 60 * 60 * 1000).toISOString(),
    // Stands in for the expiring CDN link a real feed returns. Regenerated on
    // every fetch, the same way a real refetch mints fresh urls.
    mediaUrl: `https://picsum.photos/seed/ig${index + 1}/600/750`,
    // A couple already landed, so the "ya importada" state shows up on load.
    isConverted: index === 2 || index === 7,
    convertedItemId: index === 2 || index === 7 ? `item_ig_${index + 1}` : null,
  }))
}

export function mockInstagramEnrolled(): boolean {
  return enrolled
}

/** Server-side truth in production; the same comparison here. */
export function mockInstagramAvailableAt(): string | null {
  if (!nextAvailable) return null
  return new Date(nextAvailable) > new Date() ? nextAvailable : null
}

export function mockInstagramAvailable(): boolean {
  return mockInstagramAvailableAt() === null
}

/** Called only when an import actually created something, as the API does. */
export function mockStartInstagramCooldown(): string {
  nextAvailable = new Date(Date.now() + MOCK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return nextAvailable
}

/**
 * Dev-stage lookup. **Exact handle only**, mirroring the API: Apify's profile
 * actor takes usernames, not search terms, so a partial name resolves to nothing
 * here exactly as it would in production.
 */
export function mockInstagramCandidates(query: string): InstagramProfileCandidate[] {
  const q = query.trim().replace(/^@+/, '').toLowerCase()
  if (!q) return []
  const match = CANDIDATES.find((c) => c.alias === q)
  return match ? [match] : []
}

/** Enrollment is one-shot in dev too — a second call is a no-op, not a switch. */
export function mockMarkInstagramEnrolled(): void {
  enrolled = true
}

export function mockInstagramPosts(): InstagramPost[] {
  if (!posts) posts = buildFeed()
  return posts
}

/** Flips a post to imported so a second attempt is refused, as in production. */
export function mockMarkPostImported(externalPostId: string, itemId: string): void {
  const post = mockInstagramPosts().find((p) => p.externalPostId === externalPostId)
  if (post) {
    post.isConverted = true
    post.convertedItemId = itemId
  }
}

/** Dev-stage stand-in for a media link that expired between fetch and import. */
export function mockPreviewExpired(): boolean {
  return randomInt(0, 9) === 0
}
