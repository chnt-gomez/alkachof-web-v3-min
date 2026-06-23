import { useRef, useState } from 'react'
import { Camera, ImageIcon, Loader2, X } from 'lucide-react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

type Props = {
  value: string
  onChange: (url: string) => void
  upload: (file: File) => Promise<string>
  alt?: string
  placeholder?: string
  ariaLabel?: string
}

export function ImageUploadField({
  value,
  onChange,
  upload,
  alt,
  placeholder = 'Toca para agregar imagen',
  ariaLabel,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no admitido. Usa JPG, PNG o WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen excede el tamaño máximo de 5 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await upload(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-80 disabled:opacity-50"
        onClick={() => setSheetOpen(true)}
        disabled={uploading}
        aria-label={ariaLabel ?? (value ? 'Cambiar imagen' : 'Agregar imagen')}
        aria-busy={uploading}
      >
        {uploading ? (
          <div className="flex h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Subiendo imagen…
          </div>
        ) : value ? (
          <img src={value} alt={alt ?? 'Imagen'} className="w-full object-contain" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center text-xs text-muted-foreground">
            {placeholder}
          </div>
        )}
      </button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {sheetOpen && (
        <PickerSheet
          onClose={() => setSheetOpen(false)}
          onPick={(file) => {
            setSheetOpen(false)
            void handleFile(file)
          }}
        />
      )}
    </div>
  )
}

function PickerSheet({ onClose, onPick }: { onClose: () => void; onPick: (file: File) => void }) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onPick(file)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Seleccionar imagen</p>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            className="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon size={20} className="text-primary" />
            Galería
          </button>
          <button
            className="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={20} className="text-primary" />
            Cámara
          </button>
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
