/**
 * The error shape the API surface throws, and the readers that go with it.
 *
 * Split out of `api.ts` so that `queryClient.ts` can decide whether a failure is
 * worth retrying without importing the module that imports it — `api.ts` already
 * reads `resetAppCache` from there, and an `instanceof` check across that edge
 * would close the cycle. This module imports nothing, which is what makes it
 * safe to read from either side.
 *
 * `api.ts` re-exports all of it, so `@/lib/api` remains the import site for
 * every consumer.
 */

export class ApiError extends Error {
  readonly status: number
  /** Parsed JSON response body, when the server returned one. */
  readonly body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** Envelope A — controller-rejected error body. Carries the codeDestroyed flag. */
export type ApiErrorBody = {
  message?: string
  /** Present and true only when a verification/reset code was destroyed by too many attempts. */
  codeDestroyed?: boolean
  /** Present only on a 429, from the rate limiter. ISO 8601. */
  availableAt?: string
  /** Envelope B — global error handler. */
  error?: { message?: string }
}

/**
 * The moment a 429 says the caller may try again, when the body carries one.
 *
 * Both the IP rate limiter and the per-seller Instagram cooldown answer with
 * this field, so a caller reads one shape rather than two — and since the wait
 * can be fifteen minutes or seven days, the date is what the UI must show. Null
 * when the server sent no date; say "más tarde" rather than inventing one.
 */
export function availableAtOf(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  const at = (err.body as ApiErrorBody | undefined)?.availableAt
  return typeof at === 'string' ? at : null
}

/** True only when the code was destroyed server-side after too many wrong attempts — key off this flag, never the message string. */
export function isCodeDestroyedError(err: unknown): boolean {
  return err instanceof ApiError && (err.body as ApiErrorBody | undefined)?.codeDestroyed === true
}
