/// <reference types="vite/client" />

/**
 * Build-time constants injected by `vite.config.ts`. Read them through
 * `src/lib/version.ts` rather than directly — a bare `__BUILD_SHA__` in app code
 * is a global that only exists because a bundler put it there, and it is
 * undefined under any runner that does not replicate the `define` block.
 */

/** Human-owned release name, from `package.json` (`npm version`). */
declare const __APP_VERSION__: string

/** Short git sha of the commit built, `-dirty` if the tree had changes, or `'unknown'`. */
declare const __BUILD_SHA__: string

/** ISO 8601 instant the bundle was built. */
declare const __BUILD_TIME__: string

/**
 * Unique per build, used as the persisted query cache's `buster`. Changes on
 * every build, so a deploy discards rows dehydrated by the previous one rather
 * than rehydrating them into a type that may have moved.
 */
declare const __CACHE_BUSTER__: string
