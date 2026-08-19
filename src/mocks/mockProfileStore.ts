import type { Profile } from '@/sections/auth/types'
import { randomId } from './random'

// Shared in-memory profile so fetch/update/image resolve to the same object
// within a dev-stage session. One profile per user, so a single slot is enough.
let profile: Profile | null = null

function seedProfile(): Profile {
  return {
    _id: `profile_${randomId()}`,
    userId: `user_${randomId()}`,
    alias: 'artesano_demo',
    profileDescription: 'Cuenta de demostración en etapa de desarrollo',
    phoneCountry: '+52',
    phoneContact: '5512345678',
    profile_picture_url: 'https://picsum.photos/seed/profile/200/200',
  }
}

export function readProfile(): Profile {
  if (!profile) profile = seedProfile()
  return profile
}

/**
 * Mirrors the backend merge (`data.field || profile.field`): empty strings and
 * undefined both leave the stored value untouched.
 */
export function writeProfile(patch: Partial<Profile>): Profile {
  const base = readProfile()
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value) (next as Record<string, unknown>)[key] = value
  }
  profile = next
  return next
}
