/**
 * The questions a stranger asks, answered in text.
 *
 * Two jobs, one source:
 *
 *  - **Readable answers** for a visitor who landed from a search and has never
 *    heard the name.
 *  - **`FAQPage` structured data**, so an assistant can state a fact rather
 *    than infer one. The `<script>` below is built from the *same* array that
 *    renders the list — not a parallel copy. Structured data that does not
 *    match the visible page is a policy violation, and the only durable way to
 *    guarantee it matches is to make drift impossible.
 *
 * Structured data is not a ranking boost. It makes the page machine-legible,
 * which is the half of `blueprint.SEO.md` §7 that engineering owns.
 *
 * TODO(marketing): wording pending approval. The facts are load-bearing (free,
 * no commission, 25 items, products *and* services) — if a claim changes here
 * it has changed in the product.
 */
const FAQ_ITEMS = [
  {
    question: '¿Qué es Alkachof?',
    answer:
      'Alkachof es un catálogo digital gratuito para vendedores pequeños en México. ' +
      'Publicas tus productos o servicios con las fotos que ya tienes en tu celular y ' +
      'compartes tu tienda por WhatsApp, Instagram o con un código QR.',
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'Publicar es gratis. No hay planes que elegir y Alkachof no cobra comisión por venta: ' +
      'el pago y la entrega los acuerdas directamente con tu cliente.',
  },
  {
    question: '¿Necesito una página web o una tienda en línea?',
    answer:
      'No. Tu catálogo vive en Alkachof y se comparte con un enlace. No tienes que contratar ' +
      'un dominio, instalar nada ni saber de tecnología.',
  },
  {
    question: '¿Cómo comparten mis clientes mi catálogo?',
    answer:
      'Cada catálogo tiene su propio enlace. Lo mandas por WhatsApp, lo pones en tu perfil de ' +
      'Instagram o lo imprimes como código QR. Tus clientes no necesitan crear una cuenta para verlo.',
  },
  {
    question: '¿Puedo traer mis fotos de Instagram?',
    answer:
      'Sí. Si ya vendes por Instagram puedes importar las fotos de tu cuenta pública y ' +
      'convertirlas en productos, en lugar de volver a subirlas una por una.',
  },
  {
    question: '¿Puedo ofrecer servicios y no solo productos?',
    answer:
      'Sí. Un producto se pide y un servicio se solicita: plomería, costura, banquetes, ' +
      'jardinería o cualquier oficio funcionan igual que un artículo.',
  },
  {
    question: '¿Cuántos productos puedo publicar?',
    answer: 'Hasta 25 artículos por catálogo, entre productos y servicios.',
  },
]

export function AboutFaq() {
  return (
    <section aria-labelledby="faq-title" className="flex flex-col gap-4">
      <h2 id="faq-title" className="text-xl font-bold tracking-tight text-foreground">
        Preguntas frecuentes
      </h2>

      <dl className="flex flex-col gap-4">
        {FAQ_ITEMS.map(({ question, answer }) => (
          <div key={question} className="flex flex-col gap-1">
            <dt className="font-medium text-foreground">{question}</dt>
            <dd className="text-sm text-muted-foreground">{answer}</dd>
          </div>
        ))}
      </dl>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }),
        }}
      />
    </section>
  )
}
