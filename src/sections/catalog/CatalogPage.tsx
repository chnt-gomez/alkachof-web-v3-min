import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MOCK_PRODUCTS = [
  { id: '1', name: 'Product A', description: 'Short description of product A.', price: 29.99 },
  { id: '2', name: 'Product B', description: 'Short description of product B.', price: 49.99 },
  { id: '3', name: 'Product C', description: 'Short description of product C.', price: 19.99 },
]

export function CatalogPage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Catalog</h1>
      <ul className="flex flex-col gap-4">
        {MOCK_PRODUCTS.map((product) => (
          <li key={product.id}>
            <Card>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">${product.price.toFixed(2)}</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/product/${product.id}`}>View details</Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  )
}
