import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearTokens, getToken, setTokens, TOKEN_KEY } from '@/lib/auth'
import { queryKeys } from '@/lib/queryKeys'
import { clearPersistedCache } from '@/lib/queryStorage'
import { login as loginAction, type LoginCredentials } from './actions/login'
import { signup as signupAction, type SignupData } from './actions/signup'
import { fetchProfile } from './actions/fetchProfile'
import type { Profile } from './types'
import { AuthContext, type AuthState } from './authContextValue'

/**
 * The session, backed by the shared cache.
 *
 * `AuthState` is unchanged — this provider still hands out `profile`,
 * `isBooting` and the rest — but the profile itself now lives under
 * `queryKeys.profile()`, so `updateProfile` writes somewhere that outlives this
 * tree. Within a session that changes nothing (the context already held it);
 * it is the groundwork for serving the profile from disk on a warm reload,
 * which is what takes `/profile` off the boot critical path.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  /**
   * Whether there is a session to read a profile for.
   *
   * Explicit state rather than a render-time `getToken()`, so that `enabled` has
   * already flipped to `false` when `logout` empties the cache. Reading
   * localStorage during render would leave the query enabled at that moment, and
   * an enabled observer losing its entry treats that as a reason to fetch — a
   * `/profile` call for a session that just ended.
   */
  const [hasSession, setHasSession] = useState<boolean>(() => Boolean(getToken()))

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
    enabled: hasSession,
  })

  // Preserved from the effect this replaced: a profile read that fails means the
  // token is no good, so the session is dropped rather than left half-open.
  useEffect(() => {
    if (!isError) return
    clearTokens()
    setHasSession(false)
  }, [isError])

  /**
   * Another tab ended the session.
   *
   * Tokens live in shared `localStorage`, so a logout elsewhere already leaves
   * this tab rendering as authenticated with no tokens. Persistence turns that
   * from transient UI weirdness into a real hole: this tab still holds the
   * previous user's rows in memory and **re-persists them on its next cache
   * write**, putting them back on disk after a logout. Listening closes it.
   *
   * `storage` fires only in the *other* tabs, never the one that wrote, so this
   * cannot loop. A null `key` means the whole store was cleared.
   */
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      const tokenCleared = event.key === TOKEN_KEY && event.newValue === null
      const storeCleared = event.key === null
      if (!tokenCleared && !storeCleared) return
      if (getToken()) return
      setHasSession(false)
      queryClient.clear()
      clearPersistedCache()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const profile = data ?? null

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { token, refreshToken } = await loginAction(credentials)
      setTokens(token, refreshToken)
      setHasSession(true)
      // Fetched explicitly rather than left to `enabled`: callers await `login`
      // and navigate on the next line, so the profile has to be in the cache by
      // the time this resolves — exactly as the old `await fetchProfile()` was.
      await queryClient.fetchQuery({ queryKey: queryKeys.profile(), queryFn: fetchProfile })
    },
    [queryClient],
  )

  const signup = useCallback((data: SignupData) => signupAction(data), [])

  const logout = useCallback(() => {
    clearTokens()
    setHasSession(false)
    // The query cache outlives the React tree, and it holds this seller's rows.
    // Two users on one phone is an ordinary case for this product.
    //
    // Cleared through the *injected* client, not `resetAppCache()`: in the app
    // they are the same instance, but a caller that mounts its own provider —
    // every test does — would otherwise empty a client nobody is reading.
    // `resetAppCache` exists for `api.ts`, which has no context to read from.
    queryClient.clear()
    // The disk half. Clearing memory alone would leave the previous session's
    // rows on the device — the whole reason persistence needs a boundary.
    clearPersistedCache()
  }, [queryClient])

  /**
   * The profile's only writer. Both callers pass what the API returned — the
   * edit form its full response, the image field the new url — so this is a
   * cache write, never a reason to re-read `/profile`.
   */
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      queryClient.setQueryData<Profile>(queryKeys.profile(), (prev) =>
        prev ? { ...prev, ...patch } : prev,
      )
    },
    [queryClient],
  )

  // Only a session that is still resolving blocks the app. A failed read has
  // already cleared `hasSession` above, and no session boots instantly.
  //
  // A restored profile is already in the cache when this first runs — the
  // persisted cache is read back *synchronously*, before render, precisely so
  // this is false on a warm cold-start and the app paints without a skeleton.
  // See `restoreFromDisk`.
  const isBooting = hasSession && isLoading

  const value = useMemo<AuthState>(
    () => ({
      profile,
      isAuthenticated: Boolean(profile),
      isBooting,
      login,
      signup,
      logout,
      updateProfile,
    }),
    [profile, isBooting, login, signup, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
