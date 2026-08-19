import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ImageUploadField } from '@/components/ImageUploadField'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type ItemFormPayload = {
  name: string
  description: string
  price: number
  outOfStock: boolean
  /** Null when the user kept the item's existing image (edit mode). */
  image: File | null
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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): ItemFormPayload | null {
    setError(null)
    if (mode === 'create' && !image) {
      setError('Agrega al menos una imagen para el producto.')
      return null
    }
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
      outOfStock,
      image,
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'create' ? 'Nuevo producto' : 'Editar producto'
  const saveLabel = mode === 'create' ? 'Agregar' : 'Guardar'

  return (
    <Dialog onClose={onClose} ariaLabel={title} title={title}>
          <div className="flex flex-col gap-4 p-5">
            <ImageUploadField
              value={imgPath}
              onChange={setImgPath}
              onFileSelect={setImage}
              alt={name || 'Producto'}
            />

            <Field label="Nombre">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del producto (opcional)"
              />
            </Field>

            <Field label="Descripción">
              <textarea
                className="input min-h-[64px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del producto (opcional)"
              />
            </Field>

            <Field label="Precio (pesos)">
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ej. 350"
                inputMode="decimal"
              />
            </Field>

            {mode === 'edit' && (
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
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : saveLabel}
            </Button>
          </div>
    </Dialog>
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
