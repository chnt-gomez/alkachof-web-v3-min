import { Link } from 'react-router-dom'
import { ChevronRight, PackagePlus, Store, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CatalogThumb } from '@/components/CatalogImage'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = {
  catalog: Catalog
  /** Products *and* services — the catalog holds both, hence "artículos". */
  itemCount: number
}

// Shown when the catalog is still untouched — no image and no name yet — so the
// card invites the owner in rather than rendering a nameless, blank row.
const BLANK_TITLE = 'Este es tu espacio para vender'
const BLANK_DESCRIPTION = 'Cuando quieras publicar algo lo podrás hacer aquí'

function itemLabel(count: number): string {
  if (count === 0) return 'Sin artículos todavía'
  return count === 1 ? '1 artículo' : `${count} artículos`
}

export function MyCatalogCard({ catalog, itemCount }: Props) {
  const isBlank = !catalog.image && !catalog.alias
  const title = isBlank ? BLANK_TITLE : catalog.alias
  const description = isBlank ? BLANK_DESCRIPTION : catalog.description

  return (
    <div className="flex flex-col gap-3">
      <Link
        to="/catalog"
        className="flex items-center gap-4 rounded-2xl border-2 border-primary bg-card p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98]"
        aria-label={catalog.alias ? `Abrir mi catálogo ${catalog.alias}` : 'Abrir mi catálogo'}
      >
        <CatalogThumb
          src={catalog.image}
          size="lg"
          fallback={
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Store size={34} />
            </span>
          }
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base font-semibold">{title}</span>
          {description && (
            <span className="line-clamp-2 text-sm text-muted-foreground">{description}</span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Tag size={12} className="shrink-0" />
            {itemLabel(itemCount)}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </Link>

      {itemCount === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <PackagePlus size={26} />
          </span>
          <h3 className="text-base font-semibold">Empieza a vender en Alkachof</h3>
          <p className="text-sm text-muted-foreground">
            Agrega tu primer producto para que tus clientes lo descubran.
          </p>
          <Button asChild>
            <Link to="/catalog">Agregar productos</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
