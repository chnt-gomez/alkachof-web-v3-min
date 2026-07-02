export type User = {
  _id: string
  email: string
  status: 'active' | 'inactive' | 'banned' | 'pending-registration'
  type: 'admin' | 'user'
  created: string
}

export type Profile = {
  _id: string
  userId: string
  profileDescription?: string
  alias?: string
  phoneCountry?: string
  phoneContact?: string
  phoneValidation?: boolean
  profile_picture_url?: string
}
