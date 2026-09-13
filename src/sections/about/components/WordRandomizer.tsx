import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type WordRandomizerProps = {
  /** Words to cycle through. Provide your final product/service list here. */
  words: string[]
  /** Milliseconds each word stays on screen before advancing. */
  intervalMs?: number
  className?: string
}

// TODO(content): final product/service list will be provided by the user.
const DEFAULT_WORDS = ['de todo']

/**
 * Cycles through `words` on a fixed interval, rendering one word at a time.
 * Meant to sit inside a sentence, e.g. "Compra y vende {WordRandomizer}".
 * Pauses on a single word and respects reduced-motion preferences.
 */
export function WordRandomizer({ words, intervalMs = 500, className }: WordRandomizerProps) {
  const list = words.length > 0 ? words : DEFAULT_WORDS
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Reset when the list changes so we never index out of bounds.
    // Set the index to a random value between 0 and list.length - 1 to avoid always starting with the same word.
    setIndex(Math.floor(Math.random() * list.length))
  }, [list])

  useEffect(() => {
    if (list.length <= 1) return

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const id = window.setInterval(() => {
      //Randomize again the index to avoid always cycling through the same order of words.
      setIndex(Math.floor(Math.random() * list.length))
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [list, intervalMs])

  return (
    <span
      key={list[index]}
      className={cn('inline-block animate-word-swap text-primary', className)}
    >
      {list[index]}
    </span>
  )
}
