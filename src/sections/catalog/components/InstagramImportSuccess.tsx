import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { ImportSummary } from '../hooks/useInstagramImport'

type Props = {
  summary: ImportSummary
  /** True while the dialog is about to close itself. */
  autoClosing: boolean
  onClose: () => void
}

/**
 * The last screen: what landed, then out.
 *
 * The feed is deliberately **not** re-read after an import. Refetching would
 * cost a full metered scraper run to repaint badges on a screen the seller is
 * leaving anyway — and the cooldown a successful import starts would refuse it.
 *
 * A clean import closes itself: the seller asked for photos, the photos are in
 * the catalog, and making them tap "Listo" to confirm what they can already read
 * is a step for its own sake. **A partial import does not**, because the skipped
 * list is the only place the reasons appear, and a screen that vanishes while
 * you are reading it is worse than one tap.
 *
 * **What this screen may no longer say is "try again".** Every skip reason is
 * fixed by refetching the feed, and an import that landed anything starts the
 * seller's cooldown — which is precisely what blocks that refetch. So when
 * `summary.nextAvailable` is set, the skipped list carries a date instead of an
 * invitation. Sending a seller back to a button the API will refuse is worse
 * than telling them to wait.
 */
export function InstagramImportSuccess({ summary, autoClosing, onClose }: Props) {
  const { importedCount, skipped, nextAvailable } = summary

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Check size={24} className="text-primary" />
      </span>

      <p className="text-sm font-semibold">
        {importedCount === 1
          ? 'Se agregó 1 artículo a tu catálogo.'
          : `Se agregaron ${importedCount} artículos a tu catálogo.`}
      </p>

      {importedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Ponles precio cuando quieras — quedaron guardados sin precio.
        </p>
      )}

      {/*
        The seller was told this before they chose; repeating it here is the
        receipt, not the news.
      */}
      {nextAvailable && (
        <p className="text-xs text-muted-foreground">
          Tu próxima importación de Instagram estará disponible el {formatDate(nextAvailable)}.
        </p>
      )}

      {/*
        201 is not "everything landed": every selection comes back in `imported`
        or `skipped`, and this is the only place the reasons are shown.
      */}
      {skipped.length > 0 && (
        <div className="w-full rounded-xl border p-3 text-left">
          <p className="text-sm text-muted-foreground">
            {skipped.length === 1
              ? 'No pudimos importar 1 publicación:'
              : `No pudimos importar ${skipped.length} publicaciones:`}
          </p>
          <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
            {skipped.map((skip) => (
              <li key={skip.externalPostId}>{skipReasonLabel(skip.reason)}</li>
            ))}
          </ul>
          {/*
            A cooldown started only if something landed. When it did, "vuelve a
            abrir" is an instruction the API refuses — say when instead.
          */}
          <p className="mt-2 text-xs text-muted-foreground">
            {nextAvailable
              ? `Podrás volver a intentarlo el ${formatDate(nextAvailable)}.`
              : 'Vuelve a abrir “Importar de Instagram” para intentarlo otra vez.'}
          </p>
        </div>
      )}

      {!autoClosing && (
        <Button size="sm" onClick={onClose}>
          Listo
        </Button>
      )}
    </div>
  )
}

/** The API's skip reasons are English and internal; these are what sellers read. */
export function skipReasonLabel(reason: string): string {
  switch (reason) {
    case 'That post has already been imported':
      return 'Ya la habías importado.'
    case "That post is not in this seller's imported feed":
      return 'Ya no está en tu feed. Ábrelo de nuevo y vuelve a intentarlo.'
    case 'That post has no downloadable image':
      return 'No pudimos descargar su imagen. Ábrelo de nuevo y vuelve a intentarlo.'
    case 'Max items reached':
      return 'Tu catálogo llegó al máximo de artículos.'
    default:
      return reason
  }
}
