import { useRef } from 'react'
import { Camera, ImageIcon, X } from 'lucide-react'

type Props = {
  onPick: (objectUrl: string) => void
  onClose: () => void
}

export function ImagePickerSheet({ onPick, onClose }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onPick(URL.createObjectURL(file))
    onClose()
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
          onChange={handleFile}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
