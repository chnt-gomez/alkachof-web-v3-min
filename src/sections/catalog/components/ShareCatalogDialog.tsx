import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/useToast'
import { catalogShareUrl } from '@/lib/shareUrl'

type Props = {
  catalogId: string
  catalogName: string
  onClose: () => void
}

/**
 * Explains the value of sharing, then copies the public catalog link and opens
 * the native share sheet (WhatsApp, etc.) in a single tap. On browsers without
 * the Web Share API, it just confirms the copy with a toast.
 */
export function ShareCatalogDialog({ catalogId, catalogName, onClose }: Props) {
  const toast = useToast()
  const shareUrl = catalogShareUrl(catalogId)

  function handleShare() {
    // Copy in the background so the link is on the clipboard either way. Don't
    // await it — that would spend the user gesture navigator.share() needs.
    void navigator.clipboard?.writeText(shareUrl).catch(() => {})

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: catalogName,
          text: `Mira mi catálogo en Alkachof: ${catalogName}`,
          url: shareUrl,
        })
        .catch(() => {
          // Share sheet dismissed — the link is already copied, so stay quiet.
        })
    } else {
      // No native share (typically a desktop browser).
      toast.success('Mensaje copiado al portapapeles')
    }

    onClose()
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Compartir catálogo" title="Comparte tu catálogo">
      <div className="flex flex-col gap-5 p-5">
        <p className="text-sm text-muted-foreground">
          Comparte el link de tu catálogo en redes y aplicaciones de mensajería para que tus
          clientes conozcan tus productos. Invítalos a que se suscriban para que reciban tus
          anuncios.
        </p>

        <Button size="lg" className="w-full" onClick={handleShare}>
          <Copy size={16} />
          Copiar link
        </Button>
      </div>
    </Dialog>
  )
}
