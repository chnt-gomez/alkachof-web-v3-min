import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Alkachof</CardTitle>
          <CardDescription>Discover unique products from our curated catalogs.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link to="/catalog">Browse Catalog</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
