/**
 * Bakes the public pages into `dist/` as real HTML, and emits the sitemap.
 *
 * Runs last in `npm run build`, after both the client and SSR builds. See
 * `src/prerender/entry-server.tsx` for why this is necessary at all, and
 * `blueprint.SEO.md` §5 for what it buys.
 *
 * **This script fails the build when it fails.** That is deliberate: a
 * prerender that silently no-ops ships the one-word page again, and the symptom
 * only shows up weeks later as "why are we still not in Google?". A loud
 * failure on a deploy is cheaper than a quiet regression in an index.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')

const SITE_URL = (process.env.VITE_PUBLIC_APP_URL ?? 'https://app.alkachof.mx').replace(/\/$/, '')

/**
 * Every route baked to disk.
 *
 * `/` and `/about` render the same component on purpose — it is the one product
 * pitch, reachable at two URLs — so both declare `/` as canonical and search
 * engines count one page instead of two thin duplicates competing. Only the
 * canonical URL goes in the sitemap; listing a page that points its canonical
 * somewhere else asks the crawler to resolve a contradiction.
 */
const ROUTES = [
  { path: '/', out: 'index.html', canonical: '/', sitemap: true },
  { path: '/about', out: 'about/index.html', canonical: '/', sitemap: false },
]

const { render } = await import(join(root, 'dist-ssr/entry-server.js'))

const shell = readFileSync(join(dist, 'index.html'), 'utf8')
const ROOT_DIV = '<div id="root"></div>'
if (!shell.includes(ROOT_DIV)) {
  throw new Error(
    `prerender: could not find ${ROOT_DIV} in dist/index.html. ` +
      'index.html changed shape — update this script rather than shipping an empty shell.',
  )
}

/** Replaces a tag's `content`/`href` in the built shell, or fails loudly. */
function setAttr(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`prerender: no ${label} tag in dist/index.html — index.html and this script disagree.`)
  }
  return html.replace(pattern, replacement)
}

for (const route of ROUTES) {
  const body = render(route.path)
  if (body.length < 500) {
    throw new Error(`prerender: ${route.path} rendered ${body.length} bytes — that is not a page.`)
  }

  const url = `${SITE_URL}${route.canonical}`
  let html = shell.replace(ROOT_DIV, `<div id="root">${body}</div>`)
  html = setAttr(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical')
  html = setAttr(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url')

  const outPath = join(dist, route.out)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html)

  const words = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
  console.log(`prerendered ${route.path} → dist/${route.out} (${words} words)`)
}

const sitemapUrls = ROUTES.filter((r) => r.sitemap)
const lastmod = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((r) => `  <url>\n    <loc>${SITE_URL}${r.canonical}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`,
)
console.log(`wrote dist/sitemap.xml (${sitemapUrls.length} url)`)
