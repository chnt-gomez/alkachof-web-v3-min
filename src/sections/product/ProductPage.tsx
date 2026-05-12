import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/catalog">← Back to catalog</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Product #{id}</CardTitle>
          <CardDescription>Detailed view of the product.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="aspect-square w-full rounded-lg bg-muted" />
          <p className="text-sm text-muted-foreground">Product description goes here.</p>
          <p className="text-xl font-bold">$0.00</p>
          <Button className="w-full">Add to cart</Button>
        </CardContent>
      </Card>
    </main>
  )
}
