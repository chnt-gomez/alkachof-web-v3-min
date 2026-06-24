import { useAuth } from '@/sections/auth/AuthContext'
import { uploadProfileImage } from '@/sections/auth/actions/uploadProfileImage'
import { ImageUploadField } from '@/components/ImageUploadField'

export function ProfilePage() {
  const { profile, updateProfile } = useAuth()

  if (!profile) {
    return (
      <div className="p-6 text-sm text-muted-foreground" aria-busy="true">
        Cargando perfil…
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza tu foto para que tus clientes te reconozcan.
        </p>
      </header>

      <section className="flex flex-col gap-2">
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

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Alias</dt>
          <dd>{profile.alias ?? '—'}</dd>
        </div>
        {profile.profileDescription && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</dt>
            <dd>{profile.profileDescription}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
