import { Link } from 'react-router-dom'
import { Store, MapPin, ChevronRight } from 'lucide-react'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = { catalog: Catalog }

export function CatalogCard({ catalog }: Props) {
  return (
    <Link
      to={`/edit/catalog/${catalog._id}`}
      className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98]"
      aria-label={`Abrir catálogo ${catalog.alias}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Store size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold">{catalog.alias}</span>
        {catalog.description && (
          <span className="line-clamp-2 text-sm text-muted-foreground">{catalog.description}</span>
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
  )
}
