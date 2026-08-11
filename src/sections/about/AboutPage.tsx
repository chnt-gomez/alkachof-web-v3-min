import { Link } from 'react-router-dom'
import { Leaf, ShoppingBag, Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { AboutHighlight } from './components/AboutHighlight'
import { WordRandomizer } from './components/WordRandomizer'

// TODO(content): final product/service list will be provided by the user.
const SANDBOX_WORDS = [
  'ropa',
  'postres',
  'plantas',
  'artesanías',
  'servicios',
  'muebles',
  'tecnología',
  'de todo',
]

// TODO(UX): Replace placeholder copy, ordering and highlights with final content
// provided by the UX/marketing team. Structure is intentionally slot-based so
// text can be swapped without touching layout.
const highlights = [
  {
    icon: Sparkles,
    title: 'Descubre catálogos únicos',
    description: 'Explora productos de vendedores locales, con fotos reales y a tu ritmo.',
  },
  {
    icon: ShoppingBag,
    title: 'Compra sin complicaciones',
    description: 'Arma tu pedido y finalízalo en segundos, directo desde tu teléfono.',
  },
  {
    icon: Leaf,
    title: 'Apoya lo hecho en casa',
    description: 'Cada compra impulsa a emprendedores que ponen amor en lo que ofrecen.',
  },
]

export function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-secondary via-background to-background px-5 py-10">
      <header className="flex justify-center">
        <BrandMark size="lg" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 py-10">
        <section className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
            Bienvenido a Alkachof
          </span>
          {/* TODO(UX): final hero headline */}
          <h1 className="flex flex-col items-center text-3xl font-bold tracking-tight text-foreground">
            <span>Compra y vende</span>
            <WordRandomizer words={SANDBOX_WORDS} />
          </h1>
          {/* TODO(UX): final hero subheadline */}
          <p className="text-base text-muted-foreground">
            Encuentra, conoce y compra a los mejores vendedores cerca de ti. Todo desde un
            solo lugar, pensado para tu teléfono.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          {highlights.map((highlight) => (
            <AboutHighlight key={highlight.title} {...highlight} />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{' '}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Crea una
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
