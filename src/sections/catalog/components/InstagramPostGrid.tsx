import { Check, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSelectablePost } from '../hooks/useInstagramImport'
import type { InstagramPost } from '../actions/fetchInstagramPosts'

/**
 * A caption is a paragraph; a card shows a line. The first non-empty line is the
 * same thing the API derives the product name from, so what the seller reads
 * here is what the item will be called.
 */
function captionTitle(post: InstagramPost): string {
  return post.caption.split('\n').map((line) => line.trim()).find(Boolean) ?? ''
}

type Props = {
  posts: InstagramPost[]
  selected: string[]
  /** True once the cap is reached — unselected cards stop accepting taps. */
  atLimit: boolean
  disabled: boolean
  onToggle: (externalPostId: string) => void
}

/**
 * The feed, as a masonry of tappable cards. Posts that cannot be imported —
 * videos and anything already turned into an item — stay visible but dimmed
 * and unselectable: hiding them would make the feed look like it lost posts.
 *
 * `mediaUrl` is a CDN link that expires. It is read straight off the prop into
 * the `<img>` and never copied anywhere that outlives this screen — the product
 * image an import creates is a separate copy in Alkachof's own storage.
 */
export function InstagramPostGrid({ posts, selected, atLimit, disabled, onToggle }: Props) {
  return (
    <ul className="columns-2 gap-3">
      {posts.map((post) => {
        const isSelected = selected.includes(post.externalPostId)
        const selectable = isSelectablePost(post)
        const blocked = disabled || !selectable || (atLimit && !isSelected)

        return (
          <li key={post.externalPostId} className="mb-3 break-inside-avoid">
            <button
              type="button"
              disabled={blocked}
              aria-pressed={isSelected}
              aria-label={captionTitle(post) || 'Publicación de Instagram'}
              onClick={() => onToggle(post.externalPostId)}
              className={cn(
                'relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-shadow',
                isSelected ? 'border-primary ring-2 ring-primary' : 'border-input',
                blocked && 'opacity-60',
                !blocked && 'hover:shadow-md active:scale-[0.98]',
              )}
            >
              <img
                src={post.mediaUrl}
                alt={captionTitle(post) || 'Publicación de Instagram'}
                loading="lazy"
                className="w-full object-contain bg-muted"
              />

              {isSelected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check size={14} />
                </span>
              )}

              <div className="flex flex-col gap-1 p-2">
                <p className="line-clamp-2 text-xs font-medium leading-tight">
                  {captionTitle(post) || 'Sin título'}
                </p>

                {post.isConverted ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <Check size={10} />
                    Ya importada
                  </span>
                ) : post.mediaType !== 'IMAGE' ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Clapperboard size={10} />
                    Solo fotos
                  </span>
                ) : null}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
