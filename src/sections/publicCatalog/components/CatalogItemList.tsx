import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePublicCatalog } from '../context/PublicCatalogContext'
import { ProductDetailDialog } from './ProductDetailDialog'
import type { Item } from '../actions/fetchCatalogItems'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const HIGHLIGHT_MS = 2600

export function CatalogItemList() {
  const { items } = usePublicCatalog()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Deep-link support: /catalog/:id?product=<itemId> scrolls to and highlights
  // the matching card once items have loaded.
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('product')
  const cardRefs = useRef(new Map<string, HTMLLIElement>())
  const handledTargetRef = useRef<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    if (!targetId || items.length === 0) return
    // Only act on a given target once — re-renders shouldn't re-trigger it.
    if (handledTargetRef.current === targetId) return

    const card = cardRefs.current.get(targetId)
    if (!card) {
      // Target id isn't in this catalog; mark handled so we don't keep looking.
      handledTargetRef.current = targetId
      return
    }
    handledTargetRef.current = targetId

    const scrollToCard = () =>
      card.scrollIntoView({ block: 'center', behavior: 'smooth' })

    // Wait a frame so the masonry has painted, then scroll. Product images have
    // no fixed height, so re-scroll once the target's image loads and shifts
    // layout — otherwise the card drifts out of view.
    const raf = requestAnimationFrame(scrollToCard)
    const img = card.querySelector('img')
    if (img && !img.complete) {
      img.addEventListener('load', scrollToCard, { once: true })
    }

    setHighlightedId(targetId)
    const clearHighlight = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)

    // Drop the param so a manual reload doesn't re-fire the highlight.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('product')
        return next
      },
      { replace: true },
    )

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(clearHighlight)
      if (img) img.removeEventListener('load', scrollToCard)
    }
  }, [targetId, items, setSearchParams])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin productos aún.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="columns-2 gap-3">
        {items.map((item) => (
          <li
            key={item._id}
            ref={(el) => {
              if (el) cardRefs.current.set(item._id, el)
              else cardRefs.current.delete(item._id)
            }}
            className={`mb-3 break-inside-avoid${highlightedId === item._id ? ' product-highlight' : ''}`}
          >
            <button
              className="flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setSelectedItem(item)}
            >
              {item.imgPath ? (
                <div className="flex w-full items-center justify-center overflow-hidden bg-muted">
                  <img
                    src={item.imgPath}
                    alt={item.name}
                    className="w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground text-xs">
                  Sin imagen
                </div>
              )}
              <div className="flex flex-col gap-1 p-2.5">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                {item.stock === 0 && (
                  <p className="self-start rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    Sin existencias
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedItem && (
        <ProductDetailDialog
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
