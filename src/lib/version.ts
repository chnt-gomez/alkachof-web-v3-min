/**
 * Which build is running.
 *
 * The values come from `vite.config.ts` via `define`, so this module is the one
 * place that touches the injected globals — everything else imports from here and
 * stays testable. `vitest.config.ts` pins them to fixed strings for the same
 * reason.
 *
 * The authoritative copies live outside the bundle, where they can be read
 * without executing the app: the `<meta>` tags in `index.html` and `/version.json`.
 * These constants exist for the cases that are *inside* it — a boot log, or a
 * future "Acerca de" line.
 */

/** Human-owned release name, from `package.json`. Bump with `npm version`. */
export const APP_VERSION = __APP_VERSION__

/** Short git sha of the commit built. `-dirty` if the tree had uncommitted changes. */
export const BUILD_SHA = __BUILD_SHA__

/** ISO 8601 instant the bundle was built. */
export const BUILD_TIME = __BUILD_TIME__

/**
 * What to print or paste into a bug report — `v0.1.0 (a1b2c3d)`. The sha is what
 * makes it useful: a version number covers every deploy made under it.
 */
export const VERSION_LABEL = `v${APP_VERSION} (${BUILD_SHA})`

/**
 * One line on the console at boot.
 *
 * Kept deliberately: view-source is unavailable on the phones this app runs on,
 * and a remote-inspected console is how a build actually gets identified when a
 * seller reports something. It logs no user data and costs one call.
 */
export function logVersion(): void {
  console.info(`Alkachof ${VERSION_LABEL} — built ${BUILD_TIME}`)
}
