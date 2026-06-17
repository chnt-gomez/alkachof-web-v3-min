import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCatalog, type CreateCatalogInput, type PayOption, type DeliveryType } from '../actions/createCatalog'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = {
  onClose: () => void
  onCreated: (catalog: Catalog) => void
}

const PAY_OPTIONS: { value: PayOption; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

const DELIVERY_TYPES: { value: DeliveryType; label: string }[] = [
  { value: 'location-pickup', label: 'Recoger en tienda' },
  { value: 'delivery', label: 'Entrega local' },
  { value: 'shipping', label: 'Envío' },
]

export function NewCatalogDialog({ onClose, onCreated }: Props) {
  const [alias, setAlias] = useState('')
  const [description, setDescription] = useState('')
  const [payOptions, setPayOptions] = useState<PayOption[]>(['cash'])
  const [deliveryType, setDeliveryType] = useState<DeliveryType[]>(['location-pickup'])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePay(value: PayOption) {
    setPayOptions((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function toggleDelivery(value: DeliveryType) {
    setDeliveryType((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!alias.trim()) {
      setError('Ingresa un nombre para tu catálogo')
      return
    }
    if (!description.trim()) {
      setError('Agrega una descripción')
      return
    }
    if (payOptions.length === 0) {
      setError('Selecciona al menos una forma de pago')
      return
    }
    if (deliveryType.length === 0) {
      setError('Selecciona al menos una opción de entrega')
      return
    }

    const input: CreateCatalogInput = {
      alias: alias.trim(),
      description: description.trim(),
      payOptions,
      deliveryType,
    }

    setSubmitting(true)
    try {
      const catalog = await createCatalog(input)
      onCreated(catalog)
    } catch {
      setError('No pudimos crear el catálogo. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo catálogo"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-background max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Nuevo catálogo</h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="alias">Nombre</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej. Mi tienda artesanal"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntales a tus clientes qué encontrarán aquí"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Formas de pago</legend>
            <div className="flex flex-wrap gap-2">
              {PAY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                    payOptions.includes(opt.value) ? 'bg-primary text-primary-foreground' : 'bg-background'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={payOptions.includes(opt.value)}
                    onChange={() => togglePay(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Opciones de entrega</legend>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_TYPES.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                    deliveryType.includes(opt.value) ? 'bg-primary text-primary-foreground' : 'bg-background'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={deliveryType.includes(opt.value)}
                    onChange={() => toggleDelivery(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear catálogo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
