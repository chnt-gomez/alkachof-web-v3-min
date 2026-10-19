import { Link } from 'react-router-dom'
import { Home, Megaphone, QrCode, Wifi } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { useDocumentMeta } from '@/lib/seo'
import { AboutHighlight } from './components/AboutHighlight'
import { AboutFaq } from './components/AboutFaq'
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
    icon: QrCode,
    title: 'Comparte con un enlace',
    description: 'Manda tu catálogo por WhatsApp o imprímelo como código QR. Tus clientes lo abren sin crear cuenta.',
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

/**
 * The product pitch — and, since `RootRoute` landed, the public front door.
 *
 * This component is served at **two** URLs: `/` to a signed-out visitor, and
 * `/about`. Both declare `rel="canonical"` as `/`, so search engines count one
 * page rather than two thin duplicates competing with each other. The second
 * URL is kept because it is linked from outside and from older builds.
 *
 * It is also the page the build prerenders, which constrains it: it must render
 * with no session, no API and no browser. Do not add a hook here that reads
 * auth, storage or the network. See `blueprint.SEO.md` §5.
 */
export function AboutPage() {
  useDocumentMeta({ canonicalPath: '/' })

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-10">
      <header className="flex justify-center">
        <BrandMark size="lg" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 py-10">
        <section className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-sm border-2 border-ink bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
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
          {/* The sentence a search engine or an assistant can quote verbatim.
              It is deliberately flat and declarative — a model lifts a fact, it
              cannot lift a slogan — and it is the seller-side framing, which is
              the acquisition channel this page is meant to win.
              TODO(marketing): wording pending approval; keep it quotable. */}
          <p className="text-base text-muted-foreground">
            Si vendes comida, ropa, artesanías o cualquier servicio, publica tu catálogo gratis
            con las fotos de tu celular y compártelo por WhatsApp. Sin comisiones y sin planes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          {highlights.map((highlight) => (
            <AboutHighlight key={highlight.title} {...highlight} />
          ))}
        </section>

        <AboutFaq />

        <section className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/signup">Crear cuenta</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-primary underline decoration-2 underline-offset-4"
            >
              Iniciar sesión
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
