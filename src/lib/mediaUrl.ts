import { API_BASE_URL } from './api'

// The API mints ABSOLUTE image urls (`catalog.qr`, `item.imgPath`,
// `profile_picture_url`, …) and persists them. When alkachof-api runs with
// PUBLIC_URL unset it falls back to `http://localhost:<port>` — see
// `api/util/publicImageUrlBuilder.js` — so those rows hold an origin that only
// resolves on the server's own machine. Nothing rewrites them later: a
// catalog's QR is minted once and reused forever (`catalogService.ensureQr`
// returns early when `catalog.qr` is set), so a bad origin sticks permanently.
//
// This repoints such a url at the configured API before the browser requests
// it. It is a repair for rows already written, NOT a substitute for configuring
// the backend: set PUBLIC_URL in alkachof-api so new urls are right at the
// source. When the API base is itself localhost (a developer running the API
// locally) the rewrite is an identity, so this is safe in every stage.
const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i

export function resolveMediaUrl(url: string): string
export function resolveMediaUrl(url: string | undefined): string | undefined
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return url
  return url.replace(LOOPBACK_ORIGIN, API_BASE_URL)
}
