import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/sections/auth/useAuth'
import { uploadProfileImage } from '@/sections/auth/actions/uploadProfileImage'
import { ImageUploadField } from '@/components/ImageUploadField'
import { EditProfileScreen } from './components/EditProfileScreen'

export function ProfilePage() {
  const { profile, updateProfile, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (!profile) {
    return (
      <div className="p-6 text-sm text-muted-foreground" aria-busy="true">
        Cargando perfil…
      </div>
    )
  }

  const phone = [profile.phoneCountry, profile.phoneContact].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-6 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">
            Actualiza tus datos y tu foto para que tus clientes te reconozcan.
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          aria-label="Editar perfil"
          className="shrink-0 rounded-full bg-muted p-2.5 transition-colors hover:bg-muted/70 active:scale-95"
        >
          <Pencil size={16} />
        </button>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Foto de perfil
        </h2>
        <ImageUploadField
          value={profile.profile_picture_url ?? ''}
          onChange={(url) => updateProfile({ profile_picture_url: url })}
          upload={(file) => uploadProfileImage(profile._id, file)}
          preset="profiles"
          alt={profile.alias ?? 'Perfil'}
          placeholder="Toca para agregar foto de perfil"
        />
      </section>

      <dl className="flex flex-col gap-4 rounded-2xl border bg-card p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alias
          </dt>
          <dd className="text-base font-medium">{profile.alias || '—'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Descripción
          </dt>
          <dd>{profile.profileDescription || '—'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Teléfono de contacto
          </dt>
          <dd>{phone || '—'}</dd>
        </div>
      </dl>

      <Button variant="outline" className="text-destructive" onClick={handleLogout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>

      {editing && (
        <EditProfileScreen
          profile={profile}
          onSaved={updateProfile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
