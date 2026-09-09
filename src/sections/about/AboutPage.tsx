import { Link } from 'react-router-dom'
import { Home, Megaphone, Import, Wifi } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { AboutHighlight } from './components/AboutHighlight'
import { WordRandomizer } from './components/WordRandomizer'

// TODO(content): final product/service list will be provided by the user.
const SANDBOX_WORDS = [
  'afilado',
  'albañilería',
  'banquetes',
  'cerrajería',
  'costura',
  'cuidados',
  'desazolve',
  'ebanistería',
  'electricista',
  'encuadernado',
  'enmarcado',
  'fletes',
  'herbolaria',
  'herrería',
  'hojalatería',
  'jardinería',
  'joyería',
  'luthería',
  'mecánicos',
  'modistería',
  'mudanzas',
  'mueblería',
  'peluquería',
  'piñatería',
  'planchado',
  'plomería',
  'quiropedia',
  'reciclaje',
  'relojero',
  'sobadores',
  'sonideros',
  'talabartería',
  'tapicería',
  'tejedoras',
  'vidriería',
  'zapateros',
  'Alebrijes',
  'alfarería',
  'amigurumis',
  'antojitos',
  'botanas',
  'calzado',
  'cartonería',
  'cestería',
  'chocolatería',
  'cocadas',
  'conservas',
  'cosméticos',
  'dulces',
  'embutidos',
  'encurtidos',
  'figuras',
  'filigrana',
  'grabados',
  'guisados',
  'herbolaria',
  'hojalatería',
  'huipiles',
  'inciensos',
  'jabones',
  'joyería',
  'juguetes',
  'lácteos',
  'libretas',
  'libros',
  'licores',
  'macramé',
  'madera',
  'marroquinería',
  'mermeladas',
  'miel',
  'monedas',
  'nieves',
  'panadería',
  'piñatas',
  'plantas',
  'pomadas',
  'ponchos',
  'recuerdos',
  'relojería',
  'repostaría',
  'rebozos',
  'salsas',
  'tamales',
  'textiles',
  'tortillas']
const highlights = [
  {
    icon: Wifi,
    title: 'Pon tu negocio en internet',
    description: 'Tus clientes están buscándote en línea. Crea tu perfil y empieza a vender hoy mismo.',
  },
  {
    icon: Import,
    title: 'Tráelo desde Instagram',
    description: 'Autoriza tu cuenta de Instagram y trae tu catálogo de productos.',
  },
  {
    icon: Megaphone,
    title: 'Conecta con tus clientes',
    description: 'Avisa a tus clientes de ofertas, promociones, nuevo menú o simplemente anuncia un nuevo producto.',
  },
  {
    icon: Home,
    title: 'Apoya lo hecho en casa',
    description: 'Cada compra impulsa a emprendedores locales que ponen amor en lo que ofrecen.',
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
            Alkachof es el mercado para micro y pequeños negocios. Conecta con vendedores locales, descubre productos y servicios y apoya a emprendedores de tu comunidad.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          {highlights.map((highlight) => (
            <AboutHighlight key={highlight.title} {...highlight} />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/signup">Crear cuenta</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
