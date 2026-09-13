// Copying a link from a phone fails in two ways the async Clipboard API cannot
// cover, and both were silently swallowed before:
//
//  1. `navigator.clipboard` only exists in a SECURE CONTEXT. A build served
//     over plain http — the dev server on app.alkachof.mx, a LAN ip, an ngrok
//     http tunnel — has no async clipboard at all, so `navigator.clipboard?.…`
//     short-circuits to undefined and nothing is copied. `localhost` counts as
//     secure, which is exactly why this only ever reproduced on a phone.
//  2. Firefox rejects a pending `writeText()` as soon as the document loses
//     focus, and opening the native share sheet does precisely that.
//
// `document.execCommand('copy')` is deprecated but still implemented by every
// current engine, works over http, and — the part that matters here — is
// SYNCHRONOUS: it returns before anything can steal focus, and it does not
// spend the transient user activation that `navigator.share()` needs
// afterwards. So it runs first and the async API is only the backstop, for a
// future browser that has finally dropped execCommand.

/**
 * Selection-based copy. Synchronous, returns whether the text actually landed
 * on the clipboard.
 */
function copyViaSelection(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  // Off-screen but still selectable — `display:none` or `visibility:hidden`
  // cannot be selected, and `readonly` keeps the soft keyboard from popping up.
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  // Whatever the user had highlighted is restored below — copying a link should
  // not silently destroy their selection.
  const selection = document.getSelection()
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  let copied = false
  try {
    textarea.select()
    // iOS ignores select() on a readonly field; this is what actually takes.
    textarea.setSelectionRange(0, text.length)
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  textarea.remove()
  if (previous && selection) {
    selection.removeAllRanges()
    selection.addRange(previous)
  }
  return copied
}

/**
 * Copies `text` synchronously, reporting whether it worked.
 *
 * Safe to call immediately before `navigator.share()`: it neither awaits nor
 * consumes the user activation the share sheet depends on.
 */
export function copyTextSync(text: string): boolean {
  return copyViaSelection(text)
}

/**
 * Full copy attempt: the synchronous path first, then the async Clipboard API.
 *
 * Only for callers that are NOT about to open a share sheet — awaiting this
 * spends the user activation.
 */
export async function copyText(text: string): Promise<boolean> {
  if (copyViaSelection(text)) return true
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
