import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * What version is running?
 *
 * Two halves, on two different clocks:
 *
 * - `version` is **owned by a human** — `package.json`, bumped with `npm version`.
 *   It is what a release is called out loud.
 * - `sha` / `builtAt` are **derived from the build** and cannot be forgotten,
 *   which is what makes them trustworthy when the answer matters (a seller
 *   reports a bug, and "0.4.0" covers three deploys).
 *
 * Neither is a secret: the sha of a private repo names a commit nobody outside
 * can fetch, and the build time is already inferable from asset headers.
 */
type BuildInfo = {
  version: string
  sha: string
  builtAt: string
  /** Unique per build. Doubles as the persisted-cache buster — see below. */
  buildId: string
}

function readBuildInfo(): BuildInfo {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
  ) as { version: string }

  // The build may run somewhere without `.git` (a tarball, a Docker context that
  // excluded it). An unknown sha is a worse answer, never a failed build.
  let sha = 'unknown'
  try {
    const git = (args: string) =>
      execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    sha = git('rev-parse --short HEAD')
    // A build from a dirty tree does not correspond to any commit. Say so, rather
    // than let the sha claim it does.
    if (git('status --porcelain')) sha += '-dirty'
  } catch {
    /* not a git checkout */
  }

  const builtAt = new Date().toISOString()

  return {
    version: pkg.version,
    sha,
    builtAt,
    // The timestamp is load-bearing, not decoration: the buster must differ on
    // every build, and rebuilding the same commit is ordinary.
    buildId: `${pkg.version}+${sha}.${Date.parse(builtAt)}`,
  }
}

/**
 * Publishes the build info on the two surfaces that answer "what is deployed?"
 * without opening the app:
 *
 * - `<meta>` tags in `index.html` — visible in view-source, which is the cheapest
 *   possible check and the one a person actually performs.
 * - `/version.json` — the same facts, machine-readable, for a deploy check or an
 *   uptime probe. It is emitted unhashed on purpose: a fingerprinted filename
 *   would be unfindable, which defeats the point.
 *
 * Both are served in dev too, so a smoke test written against them does not have
 * to know which stage it is pointed at.
 *
 * **nginx must not cache either one.** A `/version.json` served from a week-old
 * cache is worse than no endpoint at all — it answers confidently and wrongly.
 */
function versionPlugin(info: BuildInfo): Plugin {
  const body = `${JSON.stringify(info, null, 2)}\n`

  return {
    name: 'alkachof-version',

    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        { tag: 'meta', attrs: { name: 'app-version', content: info.version }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'build-sha', content: info.sha }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'build-time', content: info.builtAt }, injectTo: 'head' },
      ],
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body })
    },

    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(body)
      })
    },
  }
}

const buildInfo = readBuildInfo()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildInfo.version),
    __BUILD_SHA__: JSON.stringify(buildInfo.sha),
    __BUILD_TIME__: JSON.stringify(buildInfo.builtAt),
    /**
     * Busts the persisted query cache on every build.
     *
     * A row dehydrated by one build is rehydrated by the next with **no
     * validation**, so a cached type that gains or loses a field would surface as
     * a runtime error on a user's device, on the boot path. A hand-maintained
     * version constant only works if every future author remembers to bump it;
     * deriving it from the build makes that impossible to forget. The cost is
     * dropping the persisted cache on each deploy, which is far rarer than a
     * session.
     *
     * It is the build id rather than a bare timestamp so the value is legible
     * when it turns up in a devtools storage inspector — the uniqueness
     * guarantee is unchanged.
     */
    __CACHE_BUSTER__: JSON.stringify(buildInfo.buildId),
  },
  plugins: [react(), tailwindcss(), versionPlugin(buildInfo)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // No source maps in the bundle. They would triple the deploy size and hand
    // the whole client source to anyone who opens devtools on a seller's phone.
    sourcemap: false,
    // Split the deps that change on a different clock from app code. Fingerprinted
    // filenames mean an unchanged chunk is a cache hit across deploys, and this app
    // is opened on mobile data — react/leaflet/socket.io are ~half the bundle and
    // they move maybe twice a year.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', 'react-router-dom'],
          map: ['leaflet', 'react-leaflet'],
          socket: ['socket.io-client'],
          query: [
            '@tanstack/react-query',
            '@tanstack/react-query-persist-client',
            '@tanstack/query-sync-storage-persister',
          ],
        },
      },
    },
  },
  // Dev server only — `vite preview` and the production nginx host ignore this.
  server: {
    allowedHosts: ['app.alkachof.mx']
  },
  preview: {
    allowedHosts: ['app.alkachof.mx']
  }
})
