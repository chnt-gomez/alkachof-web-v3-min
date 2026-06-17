import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'

type Props = { catalog: Catalog }

export function CatalogCard({ catalog }: Props) {
  return (
    <Link
      to={`/edit/catalog/${catalog._id}`}
      className="block transition-opacity hover:opacity-90"
      aria-label={`Abrir catálogo ${catalog.alias}`}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{catalog.alias}</CardTitle>
          {catalog.description && <CardDescription>{catalog.description}</CardDescription>}
        </CardHeader>
        {catalog.location && (
          <CardContent>
            <p className="text-xs text-muted-foreground">{catalog.location}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
