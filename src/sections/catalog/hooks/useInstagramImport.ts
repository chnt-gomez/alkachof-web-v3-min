import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchInstagramStatus } from '../actions/fetchInstagramStatus'
import {
  searchInstagramProfiles,
  type AttestationCopy,
  type InstagramProfileCandidate,
} from '../actions/searchInstagramProfiles'
import { enrollInstagram } from '../actions/enrollInstagram'
import { fetchInstagramPosts, type InstagramPost } from '../actions/fetchInstagramPosts'
import {
  importInstagramPosts,
  MAX_POSTS_PER_IMPORT,
  type SkippedPost,
} from '../actions/importInstagramPosts'
import { MAX_CATALOG_ITEMS } from '@/lib/catalogLimits'

/**
 * The screen the dialog is on.
 *
 * `searching → picking → attesting` is the enrollment wizard, and it exists only
 * until the seller links an account. Every step before `browsing` is reversible;
 * the commit at the end of `attesting` is not, which is why the wizard has
 * backward edges at every step and a confirmation the seller has to tick.
 *
 * `done` is terminal. An import ends the session — the dialog reports what landed
 * and closes, rather than returning to a feed the seller is finished with.
 *
 * `cooldown` is terminal too, and for a harder reason: reading the feed is a
 * billed scraper run, and the API allows one per seller per cooldown. A seller
 * who already spent theirs cannot be shown a feed at all, so this phase replaces
 * the screen rather than disabling a button on it. There is no retry — the wait
 * is days long, and the only useful thing to show is when it ends.
 */
export type ImportPhase =
  | 'checking'
  | 'searching'
  | 'picking'
  | 'attesting'
  | 'browsing'
  | 'done'
  | 'cooldown'

export type ImportSummary = {
  importedCount: number
  skipped: SkippedPost[]
  /**
   * When the seller may import again, ISO 8601, or null when nothing landed and
   * so no cooldown started. The success screen needs this: every skip reason is
   * fixed by refetching the feed, and a successful import is exactly what blocks
   * that refetch, so telling the seller to "try again" without the date would be
   * an instruction the API refuses.
   */
  nextAvailable: string | null
}

/** A post is importable only when it is a photo and is not already an item. */
export function isSelectablePost(post: InstagramPost): boolean {
  return post.mediaType === 'IMAGE' && !post.isConverted
}

/** The attestation with the chosen handle substituted in. */
export function attestationTextFor(
  copy: AttestationCopy | null,
  candidate: InstagramProfileCandidate | null,
): string {
  if (!copy || !candidate) return ''
  return copy.template.split(copy.placeholder).join(`@${candidate.alias}`)
}

type ImportState = {
  phase: ImportPhase
  /** The last query, kept so "Buscar de nuevo" returns to an editable box. */
  query: string
  candidates: InstagramProfileCandidate[]
  /** Server-owned copy. The client renders it and never composes its own. */
  attestation: AttestationCopy | null
  selectedProfile: InstagramProfileCandidate | null
  /** The seller ticked the ownership checkbox. Gates the commit button. */
  attested: boolean
  /** A search runs a scraper actor and takes seconds. */
  isSearching: boolean
  isEnrolling: boolean
  posts: InstagramPost[]
  isLoadingPosts: boolean
  /** In-flight import — blocks a second one and drives the progress bar. */
  isImporting: boolean
  selected: string[]
  /** Spanish, user-facing. `retry` says whether "Reintentar" makes sense. */
  error: { message: string; retry: boolean } | null
  /**
   * A private account is terminal for that handle: retrying does nothing until
   * the seller changes something on Instagram, so it gets its own screen rather
   * than an error with a dead retry button.
   */
  privateAlias: string | null
  summary: ImportSummary | null
  /**
   * When this seller may next run the scraper, ISO 8601. Set from `/status`, from
   * a 429, or from the import that started it — always the server's date, never
   * one computed here.
   */
  cooldownUntil: string | null
  /** The policy length, served by the API so this copy cannot drift from the gate. */
  cooldownDays: number
}

/** Replaced by the API's own value on the first `/status` read. */
const DEFAULT_COOLDOWN_DAYS = 7

const INITIAL: ImportState = {
  phase: 'checking',
  query: '',
  candidates: [],
  attestation: null,
  selectedProfile: null,
  attested: false,
  isSearching: false,
  isEnrolling: false,
  posts: [],
  isLoadingPosts: false,
  isImporting: false,
  selected: [],
  error: null,
  privateAlias: null,
  summary: null,
  cooldownUntil: null,
  cooldownDays: DEFAULT_COOLDOWN_DAYS,
}

/**
 * @param selectionLimit How many photos this seller may pick — the slots their
 * catalog has left, not a constant. Clamped to `MAX_POSTS_PER_IMPORT`, which is
 * the API's per-call ceiling and the same catalog cap, so a caller that passes
 * something larger cannot build a batch the API would refuse with a 400.
 */
export function useInstagramImport(onImported: () => void, selectionLimit: number) {
  const [state, setState] = useState<ImportState>(INITIAL)
  const maxSelectable = Math.max(0, Math.min(selectionLimit, MAX_POSTS_PER_IMPORT))

  // The dialog can close mid-flight (a search or an import runs for seconds);
  // every async step checks this before writing state back.
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
        const selectable = new Set(
          result.posts.filter(isSelectablePost).map((p) => p.externalPostId),
        )
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
      case 'notEnrolled':
        patch({ isLoadingPosts: false, phase: 'searching', posts: [], selected: [] })
        break
      case 'unavailable':
        patch({
          isLoadingPosts: false,
          error: { message: 'No pudimos contactar a Instagram en este momento.', retry: true },
        })
        break
      // Normally unreachable: `checkEnrollment` reads `/status` first and never
      // calls this behind the gate. It still has to be handled — the cooldown
      // can start in another tab between that read and this fetch.
      case 'cooldown':
        patch({
          isLoadingPosts: false,
          phase: 'cooldown',
          cooldownUntil: result.availableAt,
          posts: [],
          selected: [],
        })
        break
      default:
        patch({ isLoadingPosts: false, error: { message: result.message, retry: true } })
    }
  }, [patch])

  const checkEnrollment = useCallback(async () => {
    patch({ phase: 'checking', error: null })
    try {
      const status = await fetchInstagramStatus()
      if (!alive.current) return
      patch({ cooldownDays: status.cooldownDays, cooldownUntil: status.nextAvailable })
      if (status.enrolled) {
        // The whole point of reading `/status` first: `loadPosts` is a billed
        // scraper run, and a seller in cooldown must not spend one to be told
        // no. The API refuses it anyway — this is what keeps them off it.
        if (!status.available) {
          patch({ phase: 'cooldown' })
          return
        }
        patch({ phase: 'browsing' })
        await loadPosts()
        return
      }
      patch({ phase: 'searching' })
    } catch (err) {
      if (!alive.current) return
      patch({
        phase: 'searching',
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
    void checkEnrollment()
  }, [checkEnrollment])

  /* --- Enrollment: search -------------------------------------------------- */

  const search = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim().replace(/^@+/, '')
      if (!query) return
      patch({ isSearching: true, error: null, query, privateAlias: null })

      const result = await searchInstagramProfiles(query)
      if (!alive.current) return

      if (result.ok) {
        patch({
          isSearching: false,
          candidates: result.profiles,
          attestation: result.attestation,
          phase: 'picking',
        })
        return
      }

      if (result.reason === 'alreadyEnrolled') {
        // Enrolled in another tab. The wizard is closed for good; go to the feed.
        patch({ isSearching: false, phase: 'browsing' })
        void loadPosts()
        return
      }

      const message =
        result.reason === 'queryRequired'
          ? 'Escribe el nombre de tu cuenta de Instagram.'
          : result.reason === 'unavailable'
            ? 'No pudimos contactar a Instagram en este momento.'
            : result.message
      patch({ isSearching: false, error: { message, retry: true } })
    },
    [patch, loadPosts],
  )

  /* --- Enrollment: pick ---------------------------------------------------- */

  const selectProfile = useCallback(
    (candidate: InstagramProfileCandidate) => {
      // A private account cannot be read at all, so picking one is a dead end —
      // explain it rather than letting the seller attest to something that will
      // be refused at commit.
      if (candidate.isPrivate) {
        patch({ privateAlias: candidate.alias })
        return
      }
      patch({ selectedProfile: candidate, attested: false, phase: 'attesting', error: null })
    },
    [patch],
  )

  /** Back to the picker from the attestation, or to the box from the picker. */
  const backToPicking = useCallback(
    () => patch({ phase: 'picking', selectedProfile: null, attested: false, error: null }),
    [patch],
  )
  const backToSearch = useCallback(
    () => patch({ phase: 'searching', candidates: [], selectedProfile: null, attested: false, error: null }),
    [patch],
  )
  const dismissPrivateNotice = useCallback(() => patch({ privateAlias: null }), [patch])

  const setAttested = useCallback((value: boolean) => patch({ attested: value }), [patch])

  /* --- Enrollment: commit -------------------------------------------------- */

  const { selectedProfile, attested, isEnrolling } = state

  /**
   * Links the account. **Irreversible** — there is no unlink endpoint — so this
   * refuses to run without an explicit tick, mirroring the API's own check
   * rather than relying on the button's disabled state alone.
   */
  const confirmEnrollment = useCallback(async () => {
    if (!selectedProfile || !attested || isEnrolling) return
    patch({ isEnrolling: true, error: null })

    const result = await enrollInstagram(selectedProfile.profileId, selectedProfile.alias)
    if (!alive.current) return

    if (result.ok || result.reason === 'alreadyEnrolled') {
      patch({ isEnrolling: false, phase: 'browsing' })
      await loadPosts()
      return
    }

    if (result.reason === 'private') {
      patch({ isEnrolling: false, phase: 'picking', privateAlias: selectedProfile.alias })
      return
    }

    const message =
      result.reason === 'mismatch'
        ? 'Esa cuenta cambió mientras la seleccionabas. Búscala de nuevo.'
        : result.reason === 'notFound'
          ? 'No encontramos esa cuenta de Instagram.'
          : result.reason === 'attestationRequired'
            ? 'Debes confirmar que la cuenta es tuya.'
            : result.reason === 'unavailable'
              ? 'No pudimos contactar a Instagram en este momento.'
              : result.message
    // A mismatch or a vanished profile is fixed by searching again, not by
    // retrying the same pair.
    const backToBox = result.reason === 'mismatch' || result.reason === 'notFound'
    patch({
      isEnrolling: false,
      phase: backToBox ? 'searching' : 'attesting',
      candidates: backToBox ? [] : state.candidates,
      error: { message, retry: false },
    })
  }, [selectedProfile, attested, isEnrolling, patch, loadPosts, state.candidates])

  /* --- Browsing and importing ---------------------------------------------- */

  const toggle = useCallback(
    (externalPostId: string) => {
      setState((prev) => {
        if (prev.selected.includes(externalPostId)) {
          return { ...prev, selected: prev.selected.filter((id) => id !== externalPostId) }
        }
        // Deselecting always works; selecting stops at what the catalog can
        // still hold. The API enforces the same bound twice — the batch size on
        // entry, and `Max items reached` per item — so this only spares the
        // seller a refusal they could not have predicted from the screen.
        if (prev.selected.length >= maxSelectable) return prev
        return { ...prev, selected: [...prev.selected, externalPostId] }
      })
    },
    [maxSelectable],
  )

  const clearSelection = useCallback(() => setState((prev) => ({ ...prev, selected: [] })), [])

  const { selected, isImporting } = state

  /** Resolves to the summary on success, or null when the whole batch failed. */
  const runImport = useCallback(async (): Promise<ImportSummary | null> => {
    // A second import while one is in flight would double-charge the rate limit
    // and race two feed refetches.
    if (isImporting || selected.length === 0) return null
    patch({ isImporting: true, error: null, summary: null })

    const result = await importInstagramPosts(
      selected.map((externalPostId) => ({ externalPostId })),
    )
    if (!alive.current) return null

    if (!result.ok) {
      // A 429 is a wait measured in days, not an error with a retry button —
      // give it the terminal screen that can state the date.
      if (result.reason === 'cooldown') {
        patch({ isImporting: false, phase: 'cooldown', cooldownUntil: result.availableAt })
        return null
      }
      const message =
        result.reason === 'catalogFull'
          ? `Tu catálogo llegó al máximo de ${MAX_CATALOG_ITEMS} artículos. Elimina alguno para importar más.`
          : result.reason === 'noCatalog'
            ? 'No encontramos tu catálogo.'
            : result.message
      patch({ isImporting: false, error: { message, retry: result.reason !== 'noCatalog' } })
      return null
    }

    const summary: ImportSummary = {
      importedCount: result.imported.length,
      skipped: result.skipped,
      nextAvailable: result.nextAvailable,
    }
    // The feed is deliberately NOT re-read. Refetching would cost a full metered
    // scraper run to repaint badges on a screen the seller is leaving — and if
    // anything landed, the cooldown this import just started would refuse it
    // anyway. `done` is terminal.
    patch({
      isImporting: false,
      selected: [],
      summary,
      phase: 'done',
      // Non-null only when something landed. Kept so the catalog screen can
      // disable its button without a second round trip.
      cooldownUntil: result.nextAvailable ?? state.cooldownUntil,
    })
    if (result.imported.length > 0) onImported()
    return summary
  }, [selected, isImporting, patch, onImported, state.cooldownUntil])

  return {
    ...state,
    /** The cap the toggle actually enforces — what the copy must quote. */
    maxSelectable,
    search,
    selectProfile,
    backToPicking,
    backToSearch,
    dismissPrivateNotice,
    setAttested,
    confirmEnrollment,
    reload: checkEnrollment,
    // `loadPosts` is deliberately NOT exposed. It is the billed scraper run, and
    // the only thing that may trigger one is opening the dialog — a refresh
    // control gave the seller a way to spend money on a feed that had not
    // changed.
    toggle,
    clearSelection,
    runImport,
  }
}
