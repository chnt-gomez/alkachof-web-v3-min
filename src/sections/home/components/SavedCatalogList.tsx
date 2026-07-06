import { Link } from 'react-router-dom'
import { Bookmark, ChevronRight, MapPin } from 'lucide-react'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = { catalogs: Catalog[] }

export function SavedCatalogList({ catalogs }: Props) {
  if (catalogs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aún no has guardado catálogos.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {catalogs.map((catalog) => (
        <li key={catalog._id}>
          <Link
            to={`/catalog/${catalog._id}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98]"
            aria-label={`Ver catálogo ${catalog.alias}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Bookmark size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-semibold">{catalog.alias}</span>
              {catalog.description && (
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {catalog.description}
                </span>
              )}
              {catalog.location && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={12} className="shrink-0" />
                  {catalog.location}
                </span>
              )}
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
