import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditCatalog } from '../context/EditCatalogContext'
import { ImagePickerSheet } from './ImagePickerSheet'

type Props = {
  catalogId: string
  onClose: () => void
}

export function AddProductModal({ catalogId, onClose }: Props) {
  const { createItem } = useEditCatalog()
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [sizes, setSizes] = useState('')
  const [imgPath, setImgPath] = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createItem({
        catalogId,
        name: name.trim(),
        description: description.trim(),
        price: Math.round(parseFloat(price) * 100) || 0,
        stock: parseInt(stock, 10) || 0,
        sizes: sizes.split(',').map((s) => s.trim()).filter(Boolean),
        imgPath,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold">Nuevo producto</h2>
            <button onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <button
              className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80"
              onClick={() => setShowPicker(true)}
              aria-label="Agregar imagen"
            >
              {imgPath ? (
                <img src={imgPath} alt={name || 'Nuevo producto'} className="w-full object-contain" />
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
                placeholder="Nombre del producto"
              />
            </Field>

            <Field label="Descripción">
              <textarea
                className="input min-h-[64px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del producto"
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
          </div>

          <div className="flex gap-3 border-t px-5 py-4">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Guardando…' : 'Agregar'}
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
