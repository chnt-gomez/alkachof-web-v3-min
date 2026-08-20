import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ImageUploadField } from '@/components/ImageUploadField'
import { cn } from '@/lib/utils'
import { isService, type ItemType } from '@/lib/item'
import { ItemTypeChip } from '@/components/ItemTypeChip'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type ItemFormPayload = {
  name: string
  description: string
  price: number
  outOfStock: boolean
  /** Null when the user kept the item's existing image (edit mode). */
  image: File | null
  /**
   * Only meaningful on create — the backend rejects an update that changes an
   * item's type, so `updateItem` strips this before sending.
   */
  type: ItemType
}

type Props = {
  mode: 'create' | 'edit'
  initial?: Item | null
  onSubmit: (payload: ItemFormPayload) => Promise<void>
  onClose: () => void
}

export function ItemFormDialog({ mode, initial = null, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price / 100) : '')
  const [imgPath, setImgPath] = useState(initial?.imgPath ?? '')
  const [image, setImage] = useState<File | null>(null)
  const [outOfStock, setOutOfStock] = useState(initial?.outOfStock ?? false)
  const [type, setType] = useState<ItemType>(initial?.type ?? 'product')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = isService({ type })
  const noun = service ? 'servicio' : 'producto'

  function validate(): ItemFormPayload | null {
    setError(null)
    if (mode === 'create' && !image) {
      setError(`Agrega al menos una imagen para el ${noun}.`)
      return null
    }
    // An empty price means zero. For a service that's the normal case — it
    // reads back as "Precio a convenir" rather than "$0.00".
    let priceCents = 0
    if (price.trim()) {
      const parsed = parseFloat(price)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('El precio debe ser un número mayor o igual a cero.')
        return null
      }
      priceCents = Math.round(parsed * 100)
    }
    return {
      name: name.trim(),
      description: description.trim(),
      price: priceCents,
      // Services have no stock, so the flag is never offered for one and must
      // not leak in from an item that changed shape.
      outOfStock: service ? false : outOfStock,
      image,
      type,
    }
  }

  async function handleSave() {
    const payload = validate()
    if (!payload) return
    setSaving(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo guardar el ${noun}.`)
    } finally {
      setSaving(false)
    }
  }

  const title =
    mode === 'create'
      ? service
        ? 'Nuevo servicio'
        : 'Nuevo producto'
      : service
        ? 'Editar servicio'
        : 'Editar producto'
  const saveLabel = mode === 'create' ? 'Agregar' : 'Guardar'

  return (
    <Dialog onClose={onClose} ariaLabel={title} title={title}>
          <div className="flex flex-col gap-4 p-5">
            {/* The type is chosen once, at creation, and can never be changed
                afterwards — so the edit form shows it as a fact, not a control. */}
            {mode === 'create' ? (
              <Field label="Tipo">
                <div role="radiogroup" aria-label="Tipo" className="flex gap-2">
                  <TypeOption
                    label="Producto"
                    tone="product"
                    selected={!service}
                    onSelect={() => setType('product')}
                  />
                  <TypeOption
                    label="Servicio"
                    tone="service"
                    selected={service}
                    onSelect={() => setType('service')}
                  />
                </div>
              </Field>
            ) : (
              <Field label="Tipo">
                <div className="flex flex-col gap-1">
                  <ItemTypeChip item={{ type }} className="px-2.5 py-1 text-xs" />
                  <p className="text-xs text-muted-foreground">
                    El tipo no se puede cambiar después de crear el artículo.
                  </p>
                </div>
              </Field>
            )}

            <ImageUploadField
              value={imgPath}
              onChange={setImgPath}
              onFileSelect={setImage}
              alt={name || (service ? 'Servicio' : 'Producto')}
            />

            <Field label="Nombre">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Nombre del ${noun} (opcional)`}
              />
            </Field>

            <Field label="Descripción">
              <textarea
                className="input min-h-[64px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Descripción del ${noun} (opcional)`}
              />
            </Field>

            <Field label={service ? 'Precio (pesos, opcional)' : 'Precio (pesos)'}>
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={service ? 'Acordar con el cliente' : 'Ej. 350'}
                inputMode="decimal"
              />
              {/* Persistent help text rather than a tooltip — this UI is
                  phone-only, so there is no hover to reveal one. */}
              {service && (
                <p className="text-xs text-muted-foreground">
                  Déjalo vacío si prefieres acordar el precio con cada cliente. Es lo más
                  común en servicios.
                </p>
              )}
            </Field>

            {mode === 'edit' && !service && (
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={outOfStock}
                  onChange={(e) => setOutOfStock(e.target.checked)}
                />
                <span className="text-sm font-medium">Sin existencias</span>
              </label>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t px-5 py-4">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            {/* The save button wears the type being created, so the choice made
                at the top of the form is still visible at the bottom where it
                is committed. Follows the picker live. */}
            <Button
              className={cn(
                'flex-1',
                service && 'bg-service text-service-ink hover:bg-service/90',
              )}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando…' : saveLabel}
            </Button>
          </div>
    </Dialog>
  )
}

/** Filled styles per type, so the picker speaks the same colour language as the
 *  chips and the Pedidos bars: green for products, purple for services. */
const SELECTED_TYPE_CLASS: Record<ItemType, string> = {
  product: 'border-product bg-product text-primary-foreground',
  service: 'border-service bg-service text-service-ink',
}

function TypeOption({
  label,
  tone,
  selected,
  onSelect,
}: {
  label: string
  /** Which type this option picks — decides its colour when selected. */
  tone: ItemType
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
        selected
          ? SELECTED_TYPE_CLASS[tone]
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
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
