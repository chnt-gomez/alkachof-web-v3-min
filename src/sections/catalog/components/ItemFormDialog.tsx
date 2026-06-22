import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagePickerSheet } from './ImagePickerSheet'
import type { Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'

export type ItemFormPayload = {
  name: string
  description: string
  price: number
  stock: number
  sizes: string[]
  imgPath: string
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
  const [stock, setStock] = useState(initial ? String(initial.stock) : '')
  const [sizes, setSizes] = useState(initial?.sizes.join(', ') ?? '')
  const [imgPath, setImgPath] = useState(initial?.imgPath ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  function validate(): ItemFormPayload | null {
    setError(null)
    if (mode === 'create' && !imgPath) {
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
    let stockNum = 0
    if (stock.trim()) {
      const parsed = parseInt(stock, 10)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Las existencias deben ser un número mayor o igual a cero.')
        return null
      }
      stockNum = parsed
    }
    return {
      name: name.trim(),
      description: description.trim(),
      price: priceCents,
      stock: stockNum,
      sizes: sizes.split(',').map((s) => s.trim()).filter(Boolean),
      imgPath,
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
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label={title}
          className="relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80"
              onClick={() => setShowPicker(true)}
              aria-label={imgPath ? 'Cambiar imagen' : 'Agregar imagen'}
            >
              {imgPath ? (
                <img src={imgPath} alt={name || 'Producto'} className="w-full object-contain" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center text-xs text-muted-foreground">
                  Toca para agregar imagen
                </div>
              )}
            </button>

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

            <Field label="Existencias">
              <input
                className="input"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Ej. 10"
                inputMode="numeric"
              />
            </Field>

            <Field label="Tallas (separadas por coma)">
              <input
                className="input"
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                placeholder="Ej. S, M, L, XL"
              />
            </Field>

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
        </div>
      </div>

      {showPicker && (
        <ImagePickerSheet onPick={setImgPath} onClose={() => setShowPicker(false)} />
      )}
    </>
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
