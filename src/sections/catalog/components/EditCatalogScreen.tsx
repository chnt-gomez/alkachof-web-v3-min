import { useEffect, useState } from 'react'
import { MapPin, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageUploadField } from '@/components/ImageUploadField'
import { useEditCatalog } from '../context/EditCatalogContext'
import { LocationEditDialog } from './LocationEditDialog'
import { fetchCatalogLocation, type CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { DELIVERY_OPTIONS } from '@/components/CatalogOptionChips'

const PAY_OPTIONS: Array<{ value: Catalog['payOptions'][number]; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit', label: 'Tarjeta de crédito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

function summarizeLocation(loc: CatalogLocation): string {
  const line1 = [loc.street_name, loc.number].filter(Boolean).join(' ')
  return [line1, loc.neighborhood, loc.city, loc.state].filter(Boolean).join(', ')
}

type Props = {
  onClose: () => void
}

export function EditCatalogScreen({ onClose }: Props) {
  const { catalog, updateCatalog, uploadCatalogImage, deleteCatalogImage } = useEditCatalog()
  const [saving, setSaving] = useState(false)
  // The catalog image persists on its own endpoint, but saving the other fields
  // mid-upload would re-render this form from a catalog that does not carry the
  // new image yet.
  const [imageBusy, setImageBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [alias, setAlias] = useState(catalog?.alias ?? '')
  const [welcomeText, setWelcomeText] = useState(catalog?.welcomeText ?? '')
  const [description, setDescription] = useState(catalog?.description ?? '')
  const [payOptions, setPayOptions] = useState<Catalog['payOptions']>(catalog?.payOptions ?? [])
  const [deliveryType, setDeliveryType] = useState<Catalog['deliveryType']>(catalog?.deliveryType ?? [])

  const [location, setLocation] = useState<CatalogLocation | null>(null)
  const [editingLocation, setEditingLocation] = useState(false)

  useEffect(() => {
    if (!catalog) return
    let active = true
    fetchCatalogLocation(catalog._id)
      .then((loc) => {
        if (active) setLocation(loc)
      })
      .catch(() => {
        // A missing location just means the "add location" affordance is shown.
      })
    return () => {
      active = false
    }
  }, [catalog])

  function togglePay(val: Catalog['payOptions'][number]) {
    setPayOptions((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]))
  }

  function toggleDelivery(val: Catalog['deliveryType'][number]) {
    setDeliveryType((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateCatalog({ alias, welcomeText, description, payOptions, deliveryType })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el catálogo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar catálogo"
        className="flex h-full w-full max-w-md flex-col bg-background"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-muted">
            <X size={20} />
          </button>
          <h1 className="text-base font-semibold">Editar catálogo</h1>
          <span className="w-8" aria-hidden="true" />
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <Field label="Nombre del catálogo">
            <input
              className="input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej. Mi Tienda Artesanal"
            />
          </Field>

          <Field label="Texto de bienvenida">
            <input
              className="input"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder="Ej. ¡Bienvenidos!"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              className="input min-h-[72px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu catálogo"
            />
          </Field>

          <Field
            label="Imagen del catálogo"
            hint="Se guarda al instante, sin esperar el botón Guardar. Usa JPG, PNG o WebP, máximo 10 MB."
          >
            <ImageUploadField
              // The context writes the action's full response back, so `value`
              // is already current by the time onChange fires — nothing to do.
              value={catalog?.image ?? ''}
              onChange={() => {}}
              upload={uploadCatalogImage}
              onDelete={deleteCatalogImage}
              onBusyChange={setImageBusy}
              preset="catalogs"
              alt={catalog?.alias || 'Catálogo'}
              placeholder="Toca para agregar imagen del catálogo"
            />
          </Field>

          <Field label="Ubicación">
            <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              {location ? (
                <p className="flex items-start gap-1.5 text-sm text-foreground">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                  {summarizeLocation(location) || 'Ubicación registrada'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no has agregado una ubicación.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setEditingLocation(true)}
              >
                <Pencil size={14} />
                {location ? 'Editar ubicación' : 'Agregar ubicación'}
              </Button>
            </div>
          </Field>

          <Field
            label="Métodos de pago"
            hint="Indica a tus clientes el tipo de pago que aceptas. Alkachof no gestiona ningún tipo de pago con tus clientes."
          >
            <div className="flex flex-col gap-2">
              {PAY_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={payOptions.includes(value)}
                    onChange={() => togglePay(value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="Tipo de entrega"
            hint="Indica el tipo de envío que puedes hacer. Alkachof no procesa ningún tipo de paquetería y los costos de envío los debes de resolver con tus clientes."
          >
            <div className="flex flex-col gap-3">
              {DELIVERY_OPTIONS.map(({ value, label, description }) => (
                <div key={value} className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={deliveryType.includes(value)}
                      onChange={() => toggleDelivery(value)}
                      className="h-4 w-4 accent-primary"
                    />
                    {label}
                  </label>
                  {description && (
                    <p className="pl-6 text-xs text-muted-foreground">{description}</p>
                  )}
                </div>
              ))}
            </div>
          </Field>
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
          <Button className="flex-1" onClick={handleSave} disabled={saving || imageBusy}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>

      {editingLocation && catalog && (
        <LocationEditDialog
          catalogId={catalog._id}
          location={location}
          onSaved={setLocation}
          onClose={() => setEditingLocation(false)}
        />
      )}
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
