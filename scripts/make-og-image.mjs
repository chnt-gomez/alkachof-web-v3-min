/**
 * Generates `public/og.png` — the 1200×630 card WhatsApp, Instagram, Facebook
 * and X draw when someone pastes a link — and `public/logo-512.png`, the raster
 * logo `schema.org/Organization` points at.
 *
 * **Run by hand, never in the build.** It shells out to `qlmanage` and `sips`,
 * which exist only on macOS; wiring it into `npm run build` would break the
 * Vercel deploy. The PNGs are committed, which is the point — they change when
 * marketing replaces the art, not on every deploy.
 *
 *     node scripts/make-og-image.mjs
 *
 * The art here is a placeholder standing in for the real thing.
 * TODO(marketing): replace with approved artwork. Keep the 1200×630 geometry —
 * every social crawler crops to it, and a different ratio gets letterboxed or
 * cut through the middle of the words.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

// Resolved from `src/index.css`'s @theme block. Kept as literals because this
// script runs outside Vite and cannot read a CSS custom property.
const MANILA = '#E4DDCD' // --color-background
const INK = '#2A2622' // --color-ink
const VIOLETA = '#79368C' // --color-primary
const PAPER = '#F4EFE2' // --color-card

/** The logo, stripped of its XML prologue so it can nest inside another SVG. */
function logoMarkup(x, y, size) {
  const raw = readFileSync(join(root, 'src/assets/alkachof-logo.svg'), 'utf8')
  const inner = raw.slice(raw.indexOf('<svg'))
  // Nested <svg> keeps the art's own viewBox, so it scales without distortion —
  // the same rule `BrandMark` follows by setting only a height.
  //
  // Illustrator ships the mark with its own `x`/`y`, and XML rejects a tag that
  // declares an attribute twice: leaving them in produces a file that parses as
  // an error page and rasterises to a screenshot of that error.
  return inner.replace(/^<svg([^>]*)>/, (_tag, attrs) => {
    const cleaned = attrs.replace(/\s(?:x|y|width|height)="[^"]*"/g, '')
    return `<svg${cleaned} x="${x}" y="${y}" width="${size}" height="${(size * 1018.27) / 1140.23}">`
  })
}

/**
 * The card is authored on a **square** canvas with the artwork confined to a
 * 1200×630 band down the middle, because that is the only geometry `qlmanage`
 * renders predictably: it fits the document's longest side to `-s`, so a square
 * document comes back at exactly 1:1 and every coordinate below is a real
 * pixel. A 1200×630 document is instead scaled to 1.9× and centre-cropped,
 * which silently produces a zoomed card with the words running off the edge.
 */
const BAND_TOP = (1200 - 630) / 2

function card() {
  const y = (n) => n + BAND_TOP
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200">
  <rect width="1200" height="1200" fill="${MANILA}"/>
  <rect x="40" y="${y(40)}" width="1120" height="550" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>
  ${logoMarkup(96, y(80), 150)}
  <text x="276" y="${y(190)}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="58" font-weight="bold" fill="${INK}">Alkachof</text>
  <text x="96" y="${y(350)}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="72" font-weight="bold" fill="${INK}">Catálogo digital gratis</text>
  <text x="96" y="${y(436)}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="72" font-weight="bold" fill="${VIOLETA}">para vender por WhatsApp</text>
  <text x="96" y="${y(524)}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="32" fill="${INK}" opacity="0.72">Publica con las fotos de tu celular · app.alkachof.mx</text>
  <g transform="rotate(-7 1000 ${y(150)})">
    <rect x="892" y="${y(104)}" width="216" height="92" fill="none" stroke="${VIOLETA}" stroke-width="7"/>
    <rect x="903" y="${y(115)}" width="194" height="70" fill="none" stroke="${VIOLETA}" stroke-width="3"/>
    <text x="1000" y="${y(165)}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="bold" fill="${VIOLETA}">GRATIS</text>
  </g>
</svg>`
}

/** qlmanage renders into a square box, so the card comes back padded — sips
 *  crops the padding back off. Neither tool can be asked for a 1200×630 render
 *  directly, which is why this is two steps rather than one. */
function rasterise(svg, outPath, width, height) {
  const dir = mkdtempSync(join(tmpdir(), 'alk-og-'))
  try {
    const svgPath = join(dir, 'card.svg')
    writeFileSync(svgPath, svg)
    // `-s` is the thumbnail's longest side. The source is square, so this is a
    // 1:1 render; `sips` then crops the square down to the card's real height.
    execFileSync('qlmanage', ['-t', '-s', '1200', '-o', dir, svgPath], { stdio: 'ignore' })
    const rendered = join(dir, 'card.svg.png')
    execFileSync('sips', ['-c', String(height), String(width), rendered, '--out', rendered], {
      stdio: 'ignore',
    })
    copyFileSync(rendered, outPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

rasterise(card(), join(root, 'public/og.png'), 1200, 630)

const logoOnly = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200">
  <rect width="1200" height="1200" fill="${MANILA}"/>
  ${logoMarkup(160, 240, 880)}
</svg>`
rasterise(logoOnly, join(root, 'public/logo-512.png'), 1200, 1200)
// schema.org wants a raster logo; 512² is the size every consumer accepts.
execFileSync('sips', ['-z', '512', '512', join(root, 'public/logo-512.png')], { stdio: 'ignore' })

console.log('wrote public/og.png (1200x630) and public/logo-512.png (512x512)')
