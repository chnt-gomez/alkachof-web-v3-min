import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AboutPage } from '@/sections/about/AboutPage'

/**
 * Renders the public pages to HTML at build time.
 *
 * Why this exists: the app is a client-rendered SPA, so the file the server
 * hands over is a shell with an empty `<div id="root">`. Googlebot runs the
 * JavaScript eventually, but **social and AI crawlers never do** — WhatsApp,
 * Instagram and Facebook preview bots, ClaudeBot, GPTBot, PerplexityBot. For
 * all of them the served page contained exactly one word: "Alkachof". That is
 * the whole reason search and assistants could not describe this product.
 *
 * `renderToStaticMarkup`, not `renderToString`: nothing hydrates this. React
 * boots normally and `createRoot()` discards the markup, so hydration markers
 * would be bytes on the wire for a correctness guarantee nobody checks.
 *
 * `MemoryRouter` rather than a static router because it needs no server
 * request object — this runs in a bare Node process with no incoming request.
 *
 * **The constraint on anything rendered here**: it must render with no session,
 * no browser and no API. A component that reads auth, `localStorage` or the
 * network will either crash the build or, worse, bake a signed-out error state
 * into the HTML every crawler reads.
 */
export function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AboutPage />
    </MemoryRouter>,
  )
}
