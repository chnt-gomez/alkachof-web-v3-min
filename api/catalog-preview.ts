/**
 * Serves the app shell with a **seller's own** title, description and image in
 * its Open Graph tags, so a catalog link pasted into WhatsApp previews as that
 * shop rather than as a grey URL.
 *
 * Why a function at all: WhatsApp, Instagram, Facebook and the AI crawlers do
 * not run JavaScript. `scripts/prerender.mjs` solves that for the static pages,
 * but a catalog is per-seller and cannot be baked at build time — there is one
 * per account and they change whenever the owner edits them.
 *
 * `vercel.json` routes **only known crawler user-agents** here. A real visitor
 * keeps hitting the static shell and never pays for the extra API round-trip,
 * which is the whole reason this is a user-agent rule and not a blanket
 * rewrite. The content served is the same page either way — the function adds
 * metadata, it does not swap the page out, which is the line between enriching
 * a preview and cloaking.
 *
 * Googlebot is deliberately **not** in that list. It runs JavaScript and reads
 * the per-route tags `useDocumentMeta` writes, and whether seller catalogs
 * should be indexed at all is still an open product decision
 * (`blueprint.SEO.md` §10). Adding it here would quietly settle that.
 */
export const config = { runtime: 'edge' }

const API_BASE_URL = (process.env.VITE_API_BASE_URL ?? 'https://api.alkachof.mx').replace(/\/$/, '')
const SITE_URL = (process.env.VITE_PUBLIC_APP_URL ?? 'https://app.alkachof.mx').replace(/\/$/, '')

/** The API is public here but not instant, and a crawler that waits is a
 *  preview that never renders. Past this, serve the generic card. */
const API_TIMEOUT_MS = 2500

type Catalog = {
  _id: string
  alias?: string
  description?: string
  welcomeText?: string
  image?: string
}

/**
 * Escapes text before it goes into an HTML attribute.
 *
 * The values below are seller-authored — a shop name is free text typed on a
 * phone. Interpolating one into `content="..."` unescaped lets a quote close
 * the attribute and anything after it become markup, on a page served from our
 * own origin. Both passes matter: `&` first, or it would double-encode the
 * entities the later replacements introduce.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Descriptions are long-form; a result snippet is truncated at ~155 anyway. */
function clamp(value: string, max = 155): string {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html
}

export default async function handler(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url)
  const catalogId = requestUrl.searchParams.get('catalogId')

  // The shell is a static file on this same deployment. It is not matched by the
  // crawler rewrite that routed us here, so fetching it cannot recurse.
  const shellResponse = await fetch(new URL('/index.html', requestUrl.origin))
  const shell = await shellResponse.text()

  const serve = (html: string) =>
    new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Short, because a seller renaming their shop should not be previewed
        // under the old name for a day. Long enough that a link doing the rounds
        // in a group chat is not one API call per recipient.
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    })

  if (!catalogId) return serve(shell)

  let catalog: Catalog | undefined
  try {
    // Public, unauthenticated read. This function holds no token and must never
    // be given one: it answers requests from anonymous crawlers.
    const response = await fetch(`${API_BASE_URL}/catalog/${encodeURIComponent(catalogId)}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    })
    if (response.ok) {
      const body = (await response.json()) as { catalog?: Catalog }
      catalog = body.catalog
    }
  } catch {
    // Fail open. A link that previews plainly still opens; a link whose preview
    // timed out looks broken. A deleted catalog answers 404 and lands here too.
  }

  if (!catalog) return serve(shell)

  const name = catalog.alias?.trim()
  const title = name ? `${name} — catálogo en Alkachof` : 'Catálogo en Alkachof'
  const description = clamp(
    catalog.description?.trim() ||
      catalog.welcomeText?.trim() ||
      'Mira el catálogo, arma tu pedido y contacta directamente al vendedor.',
  )
  // The catalog's own image, already an absolute URL minted by the API. Never a
  // third-party CDN url: those links expire and a card built on one rots
  // silently (CLAUDE.md, Findability).
  const image = catalog.image?.trim() || `${SITE_URL}/og.png`
  const canonical = `${SITE_URL}/catalog/${encodeURIComponent(catalogId)}`

  let html = shell
  html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeAttr(description)}" />`,
  )
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
  )
  html = replaceTag(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
  )
  html = replaceTag(
    html,
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
  )
  html = replaceTag(
    html,
    /<meta property="og:image" content="[^"]*" \/>/,
    `<meta property="og:image" content="${escapeAttr(image)}" />`,
  )
  html = replaceTag(
    html,
    /<meta name="twitter:image" content="[^"]*" \/>/,
    `<meta name="twitter:image" content="${escapeAttr(image)}" />`,
  )

  return serve(html)
}
