import { createContext } from 'react'
import type { LoginCredentials } from './actions/login'
import type { SignupData, SignupResult } from './actions/signup'
import type { Profile } from './types'

export type AuthState = {
  profile: Profile | null
  isAuthenticated: boolean
  isBooting: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (data: SignupData) => Promise<SignupResult>
  logout: () => void
  updateProfile: (patch: Partial<Profile>) => void
}

export const AuthContext = createContext<AuthState | null>(null)
