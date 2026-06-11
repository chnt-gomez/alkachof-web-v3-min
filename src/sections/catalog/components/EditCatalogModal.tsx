import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditCatalog } from '../context/EditCatalogContext'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

const PAY_OPTIONS: Array<{ value: Catalog['payOptions'][number]; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit', label: 'Tarjeta de crédito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

const DELIVERY_OPTIONS: Array<{ value: Catalog['deliveryType'][number]; label: string }> = [
  { value: 'location-pickup', label: 'Recoger en tienda' },
  { value: 'delivery', label: 'Entrega a domicilio' },
  { value: 'shipping', label: 'Envío a domicilio' },
]

type Props = {
  onClose: () => void
}

export function EditCatalogModal({ onClose }: Props) {
  const { catalog, updateCatalog } = useEditCatalog()
  const [saving, setSaving] = useState(false)

  const [alias, setAlias] = useState(catalog?.alias ?? '')
  const [welcomeText, setWelcomeText] = useState(catalog?.welcomeText ?? '')
  const [description, setDescription] = useState(catalog?.description ?? '')
  const [location, setLocation] = useState(catalog?.location ?? '')
  const [locationZip, setLocationZip] = useState(catalog?.locationZip ?? '')
  const [payOptions, setPayOptions] = useState<Catalog['payOptions']>(catalog?.payOptions ?? [])
  const [deliveryType, setDeliveryType] = useState<Catalog['deliveryType']>(catalog?.deliveryType ?? [])

  function togglePay(val: Catalog['payOptions'][number]) {
    setPayOptions((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  function toggleDelivery(val: Catalog['deliveryType'][number]) {
    setDeliveryType((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateCatalog({ alias, welcomeText, description, location, locationZip, payOptions, deliveryType })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Editar catálogo</h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
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

          <Field label="Ubicación">
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Oaxaca, México"
            />
          </Field>

          <Field label="Código postal">
            <input
              className="input"
              value={locationZip}
              onChange={(e) => setLocationZip(e.target.value)}
              placeholder="Ej. 68000"
              inputMode="numeric"
            />
          </Field>

          <Field label="Métodos de pago">
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

          <Field label="Tipo de entrega">
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={deliveryType.includes(value)}
                    onChange={() => toggleDelivery(value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>
        </div>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
