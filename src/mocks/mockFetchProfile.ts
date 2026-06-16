import type { Profile } from '@/sections/auth/types'
import { randomId } from './random'

export function mockFetchProfile(): Promise<Profile> {
  return Promise.resolve({
    _id: `profile_${randomId()}`,
    userId: `user_${randomId()}`,
    alias: 'artesano_demo',
    profileDescription: 'Cuenta de demostración en etapa de desarrollo',
    phoneCountry: '+52',
    phoneContact: '5512345678',
    phoneValidation: false,
    profile_picture_url: 'https://picsum.photos/seed/profile/200/200',
  })
}
