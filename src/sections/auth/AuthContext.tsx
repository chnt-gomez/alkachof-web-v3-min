import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearTokens, getToken, setTokens } from '@/lib/auth'
import { login as loginAction, type LoginCredentials } from './actions/login'
import { signup as signupAction, type SignupData, type SignupResult } from './actions/signup'
import { fetchProfile } from './actions/fetchProfile'
import type { Profile } from './types'

type AuthState = {
  profile: Profile | null
  isAuthenticated: boolean
  isBooting: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (data: SignupData) => Promise<SignupResult>
  logout: () => void
  updateProfile: (patch: Partial<Profile>) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isBooting, setIsBooting] = useState<boolean>(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) {
      setIsBooting(false)
      return
    }
    let cancelled = false
    fetchProfile()
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        clearTokens()
      })
      .finally(() => {
        if (!cancelled) setIsBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { token, refreshToken } = await loginAction(credentials)
    setTokens(token, refreshToken)
    const p = await fetchProfile()
    setProfile(p)
  }, [])

  const signup = useCallback((data: SignupData) => signupAction(data), [])

  const logout = useCallback(() => {
    clearTokens()
    setProfile(null)
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

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

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
