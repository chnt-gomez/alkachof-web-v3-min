import { afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { clearTokens } from '@/lib/auth'

// Node 26 defines its own experimental `localStorage` global — unusable unless
// the process was started with `--localstorage-file`. Because the name is
// already taken on `globalThis`, vitest's jsdom environment skips installing
// jsdom's, and every `localStorage` call in app code and tests alike throws.
// (`sessionStorage`, which Node does not define, comes through untouched.)
//
// Back the name with jsdom's own `sessionStorage` instance: a real `Storage`,
// same semantics, and the window is per test file either way. Remove this once
// the toolchain stops colliding with the Node global.
if (typeof globalThis.localStorage === 'undefined') {
  const store = window.sessionStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => store,
  })
}

// jsdom does not implement the object-url APIs used for local image previews.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-preview'
  URL.revokeObjectURL = () => {}
}

// jsdom keeps one cookie jar per test *file*, and `localStorage.clear()` no
// longer touches the tokens, so a test that logs in would leave the next one in
// the file authenticated — silent, and it makes tests pass for the wrong
// reason. Global so the author of the next test cannot forget it; via
// `clearTokens` so the cleanup follows the implementation if storage ever moves
// again.
afterEach(() => clearTokens())
