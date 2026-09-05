import { useCallback, useEffect, useRef, useState } from 'react'
import { openPhylloConnect } from '@/lib/phylloConnect'
import { createPhylloConnectToken } from '../actions/createPhylloConnectToken'
import {
  fetchInstagramAccount,
  type InstagramAccountStatus,
} from '../actions/fetchInstagramAccount'
import { fetchInstagramPosts, type InstagramPost } from '../actions/fetchInstagramPosts'
import {
  importInstagramPosts,
  MAX_POSTS_PER_IMPORT,
  type SkippedPost,
} from '../actions/importInstagramPosts'

/**
 * Phyllo fires `accountConnected` before its own backend has finished writing
 * the account, so the first `/phyllo/account` read after the modal closes can
 * still say NOT_CONNECTED. Poll a few times before believing it.
 */
const CONNECT_POLL_ATTEMPTS = 6
const CONNECT_POLL_INTERVAL_MS = 1500

export type ImportSummary = {
  importedCount: number
  skipped: SkippedPost[]
}

/** A post is importable only when it is a photo and is not already an item. */
export function isSelectablePost(post: InstagramPost): boolean {
  return post.format === 'IMAGE' && !post.imported
}

type ImportState = {
  status: InstagramAccountStatus | null
  username: string | null
  /** Reading the account, or polling right after the modal closed. */
  isLoadingAccount: boolean
  /** The Connect modal is open, or its token is being minted. */
  isConnecting: boolean
  posts: InstagramPost[]
  isLoadingPosts: boolean
  /** In-flight import — blocks a second one and drives the progress bar. */
  isImporting: boolean
  selected: string[]
  /** Spanish, user-facing. `retry` says whether "Reintentar" makes sense. */
  error: { message: string; retry: boolean } | null
  summary: ImportSummary | null
}

export function useInstagramImport(onImported: () => void) {
  const [state, setState] = useState<ImportState>({
    status: null,
    username: null,
    isLoadingAccount: true,
    isConnecting: false,
    posts: [],
    isLoadingPosts: false,
    isImporting: false,
    selected: [],
    error: null,
    summary: null,
  })

  // The dialog can close mid-flight (an import runs for seconds); every async
  // step checks this before writing state back.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const patch = useCallback((next: Partial<ImportState>) => {
    if (alive.current) setState((prev) => ({ ...prev, ...next }))
  }, [])

  const loadPosts = useCallback(async () => {
    patch({ isLoadingPosts: true, error: null })
    const result = await fetchInstagramPosts()
    if (!alive.current) return
    if (result.ok) {
      // Drop selections the refreshed feed no longer offers — a post that got
      // imported meanwhile must not ride along into the next import.
      setState((prev) => {
        const selectable = new Set(result.posts.filter(isSelectablePost).map((p) => p.contentId))
        return {
          ...prev,
          posts: result.posts,
          selected: prev.selected.filter((id) => selectable.has(id)),
          isLoadingPosts: false,
        }
      })
      return
    }
    switch (result.reason) {
      case 'notConnected':
        patch({
          isLoadingPosts: false,
          status: 'NOT_CONNECTED',
          posts: [],
          selected: [],
        })
        break
      case 'unavailable':
        patch({
          isLoadingPosts: false,
          error: {
            message: 'No pudimos contactar a Instagram en este momento.',
            retry: true,
          },
        })
        break
      default:
        patch({ isLoadingPosts: false, error: { message: result.message, retry: true } })
    }
  }, [patch])

  const loadAccount = useCallback(async () => {
    patch({ isLoadingAccount: true, error: null })
    try {
      const account = await fetchInstagramAccount()
      if (!alive.current) return
      patch({
        status: account.status,
        username: account.platformUsername,
        isLoadingAccount: false,
      })
      if (account.status === 'CONNECTED') await loadPosts()
    } catch (err) {
      if (!alive.current) return
      patch({
        isLoadingAccount: false,
        error: {
          message:
            err instanceof Error
              ? err.message
              : 'No pudimos leer el estado de tu cuenta de Instagram.',
          retry: true,
        },
      })
    }
  }, [patch, loadPosts])

  useEffect(() => {
    void loadAccount()
  }, [loadAccount])

  /** Opens Phyllo's Connect modal, then polls until the link shows up. */
  const connect = useCallback(async () => {
    patch({ isConnecting: true, error: null })

    const tokenResult = await createPhylloConnectToken()
    if (!alive.current) return
    if (!tokenResult.ok) {
      const message =
        tokenResult.reason === 'unavailable'
          ? 'No pudimos conectar con Instagram en este momento.'
          : tokenResult.reason === 'unauthenticated'
            ? 'Tu sesión expiró. Inicia sesión de nuevo.'
            : tokenResult.message
      patch({
        isConnecting: false,
        error: { message, retry: tokenResult.reason !== 'unauthenticated' },
      })
      return
    }

    const outcome = await openPhylloConnect({
      token: tokenResult.token.sdkToken,
      userId: tokenResult.token.phylloUserId,
      workPlatformId: tokenResult.token.workPlatformId,
      environment: tokenResult.token.environment,
    })
    if (!alive.current) return

    if (outcome.status !== 'connected') {
      const message =
        outcome.status === 'exited'
          ? 'Cancelaste la conexión con Instagram.'
          : outcome.status === 'tokenExpired'
            ? 'La sesión de conexión expiró. Vuelve a intentarlo.'
            : outcome.status === 'unavailable'
              ? 'No pudimos abrir la ventana de Instagram. Revisa tu conexión.'
              : 'Instagram no pudo completar la conexión.'
      patch({ isConnecting: false, error: { message, retry: true } })
      return
    }

    patch({ isLoadingAccount: true })
    for (let attempt = 0; attempt < CONNECT_POLL_ATTEMPTS; attempt++) {
      try {
        const account = await fetchInstagramAccount()
        if (!alive.current) return
        if (account.status === 'CONNECTED') {
          patch({
            status: account.status,
            username: account.platformUsername,
            isConnecting: false,
            isLoadingAccount: false,
          })
          await loadPosts()
          return
        }
      } catch {
        // Keep polling — a single failed read mid-handshake is not the answer.
      }
      await new Promise((resolve) => setTimeout(resolve, CONNECT_POLL_INTERVAL_MS))
      if (!alive.current) return
    }

    patch({
      isConnecting: false,
      isLoadingAccount: false,
      error: {
        message: 'Instagram tardó más de lo normal en responder. Vuelve a intentarlo.',
        retry: true,
      },
    })
  }, [patch, loadPosts])

  const toggle = useCallback((contentId: string) => {
    setState((prev) => {
      if (prev.selected.includes(contentId)) {
        return { ...prev, selected: prev.selected.filter((id) => id !== contentId) }
      }
      if (prev.selected.length >= MAX_POSTS_PER_IMPORT) return prev
      return { ...prev, selected: [...prev.selected, contentId] }
    })
  }, [])

  const clearSelection = useCallback(() => setState((prev) => ({ ...prev, selected: [] })), [])

  const dismissSummary = useCallback(
    () => setState((prev) => ({ ...prev, summary: null })),
    [],
  )

  const { selected, isImporting } = state

  /** Resolves to the summary on success, or null when the whole batch failed. */
  const runImport = useCallback(async (): Promise<ImportSummary | null> => {
    // A second import while one is in flight would double-charge the rate limit
    // and race two feed refetches.
    if (isImporting || selected.length === 0) return null
    patch({ isImporting: true, error: null, summary: null })

    const result = await importInstagramPosts(selected.map((contentId) => ({ contentId })))
    if (!alive.current) return null

    if (!result.ok) {
      const message =
        result.reason === 'catalogFull'
          ? 'Tu catálogo llegó al máximo de artículos.'
          : result.reason === 'noCatalog'
            ? 'No encontramos tu catálogo.'
            : result.reason === 'rateLimited'
              ? 'Hiciste demasiadas importaciones seguidas. Espera unos minutos.'
              : result.message
      patch({ isImporting: false, error: { message, retry: result.reason !== 'noCatalog' } })
      return null
    }

    const summary: ImportSummary = {
      importedCount: result.imported.length,
      skipped: result.skipped,
    }
    patch({ isImporting: false, selected: [], summary })
    // Every skip reason is fixed by re-reading the feed, and a success has to
    // repaint the "ya importado" badges, so refetch either way.
    await loadPosts()
    if (result.imported.length > 0) onImported()
    return summary
  }, [selected, isImporting, patch, loadPosts, onImported])

  return {
    ...state,
    connect,
    reload: loadAccount,
    reloadPosts: loadPosts,
    toggle,
    clearSelection,
    runImport,
    dismissSummary,
  }
}
