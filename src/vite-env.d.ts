/// <reference types="vite/client" />

/**
 * Build id injected by `vite.config.ts`, used as the persisted query cache's
 * `buster`. Changes on every build, so a deploy discards rows dehydrated by the
 * previous one rather than rehydrating them into a type that may have moved.
 */
declare const __CACHE_BUSTER__: string
