import { IS_DEV_STAGE } from './stage'

/**
 * Phyllo's web Connect SDK, loaded from their CDN. There is no npm package for
 * the web build — only the React Native one — so the script is injected on
 * demand and read off `window.PhylloConnect`. It is fetched the first time the
 * seller opens the import screen, never on app boot: nobody who does not import
 * from Instagram should pay for it.
 */
const SDK_URL = 'https://cdn.getphyllo.com/connect/v2/phyllo-connect.js'

/** Shown inside Phyllo's own consent screen, so it must read as the brand. */
const CLIENT_DISPLAY_NAME = 'Alkachof'

export type PhylloEnvironment = 'sandbox' | 'production'

/**
 * Must match the API's `PHYLLO_ENV` — a sandbox client cannot open a token
 * minted for production and vice versa. `/phyllo/connect-token` does not
 * report it today, so it is configured on both sides; when the API starts
 * sending `environment`, that value wins (see `openPhylloConnect`).
 */
const CONFIGURED_ENV: PhylloEnvironment =
  import.meta.env.VITE_PHYLLO_ENV === 'production' ? 'production' : 'sandbox'

/**
 * How the Connect modal ended. `connected` is the only outcome that warrants
 * re-reading `/phyllo/account`; the rest are dead ends the UI words differently.
 */
export type PhylloConnectOutcome =
  | { status: 'connected'; accountId: string }
  /** The seller closed the modal without linking anything. */
  | { status: 'exited' }
  /** The SDK token lapsed mid-flow — mint a new one and retry. */
  | { status: 'tokenExpired' }
  /** Instagram (or Phyllo) refused the link. */
  | { status: 'failed'; reason: string | null }
  /** The script never loaded, or the SDK rejected the config. */
  | { status: 'unavailable' }

type PhylloHandle = {
  open: () => void
  exit: () => void
  on: (event: string, callback: (...args: string[]) => void) => void
}

type PhylloSdk = {
  initialize: (config: Record<string, unknown>) => PhylloHandle | undefined
}

declare global {
  interface Window {
    PhylloConnect?: PhylloSdk
  }
}

let sdkPromise: Promise<PhylloSdk | null> | null = null

function loadSdk(): Promise<PhylloSdk | null> {
  if (window.PhylloConnect) return Promise.resolve(window.PhylloConnect)
  // Memoised on the promise, not on the result: two taps in a row must share
  // one <script> tag rather than race two of them into the document.
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<PhylloSdk | null>((resolve) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve(window.PhylloConnect ?? null)
    script.onerror = () => {
      // Let a later attempt retry the download — an offline first tap should
      // not poison the screen for the rest of the session.
      sdkPromise = null
      script.remove()
      resolve(null)
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

export type PhylloConnectConfig = {
  /** `sdkToken` from `/phyllo/connect-token`. Short-lived — never cached. */
  token: string
  /** `phylloUserId` from the same response. */
  userId: string
  /** Instagram's id, from the same response. Never hardcoded here. */
  workPlatformId: string
  /** Sent by the API once it reports one; falls back to `VITE_PHYLLO_ENV`. */
  environment?: PhylloEnvironment
}

/**
 * Opens Phyllo's Connect modal and resolves once it closes.
 *
 * The SDK fires `accountConnected` while its iframe is still open — the seller
 * may keep going or back out afterwards — so the terminal event is `exit`, and
 * whatever was recorded before it decides the outcome.
 *
 * In dev stage this resolves as connected without loading anything: the mocked
 * `/phyllo/*` endpoints then behave as if the seller had linked an account, so
 * the whole screen is reachable with no Phyllo credentials.
 */
export async function openPhylloConnect(
  config: PhylloConnectConfig,
): Promise<PhylloConnectOutcome> {
  if (IS_DEV_STAGE) return { status: 'connected', accountId: 'mock_phyllo_account' }

  const sdk = await loadSdk()
  if (!sdk) return { status: 'unavailable' }

  // `initialize` logs and returns undefined on a bad config instead of throwing.
  const handle = sdk.initialize({
    clientDisplayName: CLIENT_DISPLAY_NAME,
    environment: config.environment ?? CONFIGURED_ENV,
    userId: config.userId,
    token: config.token,
    workPlatformId: config.workPlatformId,
    singleAccount: true,
    language: 'es',
  })
  if (!handle) return { status: 'unavailable' }

  return new Promise<PhylloConnectOutcome>((resolve) => {
    let settled = false
    let connectedAccountId: string | null = null
    let failureReason: string | null = null
    let failed = false

    function settle(outcome: PhylloConnectOutcome) {
      if (settled) return
      settled = true
      resolve(outcome)
    }

    // All four of these are mandatory: `open()` throws if any is missing.
    handle.on('accountConnected', (accountId) => {
      connectedAccountId = accountId
    })
    handle.on('accountDisconnected', () => {
      connectedAccountId = null
    })
    handle.on('connectionFailure', (reason) => {
      failed = true
      failureReason = reason ?? null
    })
    handle.on('tokenExpired', () => settle({ status: 'tokenExpired' }))
    handle.on('exit', () => {
      if (connectedAccountId) return settle({ status: 'connected', accountId: connectedAccountId })
      if (failed) return settle({ status: 'failed', reason: failureReason })
      settle({ status: 'exited' })
    })

    handle.open()
  })
}
