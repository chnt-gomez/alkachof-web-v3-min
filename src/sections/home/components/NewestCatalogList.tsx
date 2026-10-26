import { Link } from 'react-router-dom'
import { ChevronRight, Store } from 'lucide-react'
import { CatalogThumb } from '@/components/CatalogImage'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { publicCatalogName } from '@/lib/catalogName'
import { formatRelative } from '@/lib/format'
import type { NewestCatalogRow } from '../actions/fetchNewestCatalogs'

type Props = { catalogs: NewestCatalogRow[] }

/**
 * The newest shops on the platform, newest first.
 *
 * Every row is a verified seller, but one who may not have named their shop or
 * uploaded a picture yet — a catalog enters the showcase when its owner
 * verifies their phone. **A blank name and a missing image are the normal case
 * here, not an error**, so both go through the fallbacks the rest of the app
 * uses: `publicCatalogName` (the public voice — the owner's "Mi" would be
 * someone else's shop) and `CatalogThumb`'s own placeholder, which paints
 * `PLACEHOLDER_BG` behind the artwork so the letterboxing is invisible.
 * Neither fallback is ever written back to the row.
 *
 * All 25 rows, with no client-side cap: the cap is the server's and this is the
 * whole response. A shorter list would need a "ver todos" with nowhere to go —
 * there is no route and no pagination.
 *
 * The age is rendered bare. Under a heading that says *Catálogos nuevos* the
 * relative time needs no verb, and every candidate prefix reads badly against
 * `formatRelative`'s date fallback past a week ("Se abrió 14 de julio").
 */
export function NewestCatalogList({ catalogs }: Props) {
  if (catalogs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-ink border-dashed p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Store size={22} />
        </span>
        <p className="text-sm text-muted-foreground">
          Todavía no hay catálogos nuevos. Cuando alguien abra su tienda, va a aparecer aquí.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {catalogs.map((row) => (
        <li key={row.catalogId}>
          <Link
            to={`/catalog/${row.catalogId}`}
            className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-4 transition-[box-shadow,transform]"
            aria-label={`Ver catálogo ${publicCatalogName(row.alias)}`}
          >
            <CatalogThumb src={resolveMediaUrl(row.image)} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-semibold">
                {publicCatalogName(row.alias)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelative(row.createdOn)}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
