import { useState, useEffect } from 'react'
import { useCart } from './context/CartContext'
import { fetchPublicCatalog, type Catalog } from '@/sections/publicCatalog/actions/fetchPublicCatalog'
import { fetchCatalogItems, type Item } from '@/sections/publicCatalog/actions/fetchCatalogItems'
import { CartCatalogGroup } from './components/CartCatalogGroup'

type CatalogData = {
  catalog: Catalog
  items: Item[]
}

export function CartPage() {
  const { carts } = useCart()
  const [catalogDataMap, setCatalogDataMap] = useState<Record<string, CatalogData>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (carts.length === 0) {
      setCatalogDataMap({})
      return
    }

    setIsLoading(true)
    const loadCatalogData = async () => {
      const map: Record<string, CatalogData> = {}

      for (const cart of carts) {
        try {
          const [catalog, items] = await Promise.all([
            fetchPublicCatalog(cart.catalogId),
            fetchCatalogItems(cart.catalogId),
          ])
          map[cart.catalogId] = { catalog, items }
        } catch {
          // error handled upstream
        }
      }

      setCatalogDataMap(map)
      setIsLoading(false)
    }

    loadCatalogData()
  }, [carts])

  if (carts.length === 0 && !isLoading) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4">
        <p className="text-lg font-semibold">Tu carrito está vacío</p>
        <p className="text-sm text-muted-foreground">Explora nuestros catálogos para empezar a comprar</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Mi carrito</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {carts.map((cart) => {
            const catalogData = catalogDataMap[cart.catalogId]
            if (!catalogData) return null
            return (
              <CartCatalogGroup
                key={cart.id}
                cart={cart}
                catalog={catalogData.catalog}
                items={catalogData.items}
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
