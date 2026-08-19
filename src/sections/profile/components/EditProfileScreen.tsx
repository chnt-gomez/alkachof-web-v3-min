import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateProfile as updateProfileAction, type ProfileFields } from '@/sections/auth/actions/updateProfile'
import type { Profile } from '@/sections/auth/types'

type Props = {
  profile: Profile
  onSaved: (profile: Profile) => void
  onClose: () => void
}

/**
 * The backend merges with `data.field || profile.field`, so an empty string
 * never clears a stored value — it silently keeps the old one. Only send what
 * actually changed and is non-empty, so the UI never promises a clear it
 * cannot deliver.
 */
function buildPatch(
  profile: Profile,
  next: Record<keyof ProfileFields, string>
): Partial<ProfileFields> {
  const patch: Partial<ProfileFields> = {}
  for (const key of Object.keys(next) as Array<keyof ProfileFields>) {
    const value = next[key].trim()
    if (value && value !== (profile[key] ?? '')) patch[key] = value
  }
  return patch
}

export function EditProfileScreen({ profile, onSaved, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [alias, setAlias] = useState(profile.alias ?? '')
  const [profileDescription, setProfileDescription] = useState(profile.profileDescription ?? '')
  const [phoneCountry, setPhoneCountry] = useState(profile.phoneCountry ?? '')
  const [phoneContact, setPhoneContact] = useState(profile.phoneContact ?? '')

  async function handleSave() {
    const patch = buildPatch(profile, { alias, profileDescription, phoneCountry, phoneContact })
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateProfileAction(profile._id, patch)
      onSaved(updated)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar perfil"
        className="flex h-full w-full max-w-md flex-col bg-background"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-muted">
            <X size={20} />
          </button>
          <h1 className="text-base font-semibold">Editar perfil</h1>
          <span className="w-8" aria-hidden="true" />
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <Field label="Alias">
            <input
              className="input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej. artesano_mx"
            />
          </Field>

          <Field
            label="Descripción"
            hint="Cuéntales a tus clientes quién eres y qué vendes."
          >
            <textarea
              className="input min-h-[72px] resize-none"
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Ej. Vendo artesanías hechas a mano"
            />
          </Field>

          <Field label="Teléfono de contacto">
            <div className="flex gap-2">
              <input
                className="input w-20 shrink-0"
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
                placeholder="+52"
                inputMode="tel"
                aria-label="Lada"
              />
              <input
                className="input flex-1"
                value={phoneContact}
                onChange={(e) => setPhoneContact(e.target.value)}
                placeholder="5512345678"
                inputMode="tel"
                aria-label="Número de teléfono"
              />
            </div>
          </Field>

          <p className="text-xs text-muted-foreground">
            Por ahora los campos no se pueden dejar vacíos: si borras el contenido, se conservará el
            valor anterior.
          </p>
        </div>

        {saveError && (
          <p role="alert" className="border-t px-5 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}

        <div className="flex gap-3 border-t px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}
