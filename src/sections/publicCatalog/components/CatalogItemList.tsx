import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePublicCatalog } from '../context/PublicCatalogContext'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function CatalogItemList() {
  const { items } = usePublicCatalog()

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin productos aún.</p>
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item._id}>
          <Card>
            {item.imgPath && (
              <img
                src={item.imgPath}
                alt={item.name}
                className="h-40 w-full rounded-t-md object-cover"
              />
            )}
            <CardHeader>
              <CardTitle className="text-base">{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              <p className="font-medium">{formatPrice(item.price)}</p>
              {item.stock > 0 ? (
                <p className="text-xs text-muted-foreground">{item.stock} disponibles</p>
              ) : (
                <p className="text-xs text-destructive">Sin existencias</p>
              )}
              {item.sizes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.sizes.map((s) => (
                    <span key={s} className="rounded border px-1.5 py-0.5 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
