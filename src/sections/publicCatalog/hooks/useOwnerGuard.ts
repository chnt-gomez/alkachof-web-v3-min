import { useCallback } from 'react'
import { useToast } from '@/components/ui/useToast'
import { usePublicCatalog } from '../context/PublicCatalogContext'

/**
 * Blocks the buyer-side actions on a catalog its own owner is visiting —
 * buying, asking a question, requesting a service.
 *
 * The controls stay in the DOM and stay clickable: a truly `disabled` button
 * fires no click, so the owner would tap it and get silence. Instead they look
 * inert (`ownerBlockedProps` dims them and sets `aria-disabled`) and explain
 * themselves via a toast when tapped.
 */
export function useOwnerGuard() {
  const { isOwner } = usePublicCatalog()
  const toast = useToast()

  /**
   * Wraps a handler so an owner gets `message` instead of the action. Returns
   * the handler untouched for everyone else.
   */
  const guard = useCallback(
    <T extends unknown[]>(message: string, action: (...args: T) => void) =>
      (...args: T) => {
        if (isOwner) {
          toast.error(message)
          return
        }
        action(...args)
      },
    [isOwner, toast],
  )

  return {
    isOwner,
    guard,
    /** Put on the guarded control so assistive tech reads it as unavailable. */
    ariaDisabled: isOwner || undefined,
    /** Merge into the control's className (via `cn`) so it looks unavailable. */
    blockedClass: isOwner ? 'opacity-50' : '',
  }
}
