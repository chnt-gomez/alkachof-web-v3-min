import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/sections/auth/useAuth'
import { uploadProfileImage } from '@/sections/auth/actions/uploadProfileImage'
import { ImageUploadField } from '@/components/ImageUploadField'

export function ProfilePage() {
  const { profile, updateProfile, logout } = useAuth()
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

  return (
    <div className="flex flex-col gap-6 p-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza tu foto para que tus clientes te reconozcan.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Foto de perfil
        </h2>
        <ImageUploadField
          value={profile.profile_picture_url ?? ''}
          onChange={(url) => updateProfile({ profile_picture_url: url })}
          upload={(file) => uploadProfileImage(profile._id, file)}
          alt={profile.alias ?? 'Perfil'}
          placeholder="Toca para agregar foto de perfil"
        />
      </section>

      <dl className="flex flex-col gap-4 rounded-2xl border bg-card p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alias
          </dt>
          <dd className="text-base font-medium">{profile.alias ?? '—'}</dd>
        </div>
        {profile.profileDescription && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Descripción
            </dt>
            <dd>{profile.profileDescription}</dd>
          </div>
        )}
      </dl>

      <Button variant="outline" className="text-destructive" onClick={handleLogout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  )
}
