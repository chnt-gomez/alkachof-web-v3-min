# Fix: leaked `setInterval` in CartContext test

## Symptom

`npm run test` reports **1 error** even though all 123 tests pass:

```
TestingLibraryElementError: Unable to find an element by: [data-testid="cart-count"]
 ❯ Timeout._onTimeout src/sections/cart/__tests__/CartContext.test.tsx:199:34
```

The stack trace blames the test `'should reject checkout with empty cart'`, but that is
a red herring — the error only *surfaces* there.

## Root cause

`src/sections/cart/__tests__/CartContext.test.tsx`, test
`'should remove item when quantity set to 0'` (lines ~170–207):

```ts
await act(async () => {
  const cart = new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const countEl = screen.getByTestId('cart-count')
      if (countEl.textContent === '0') {
        clearInterval(interval)
        resolve()
      }
    }, 50)
  })
})
```

Problems, all in this block:

1. **The interval never clears.** Nothing sets item-1's quantity to `0`
   (`textContent` is stuck at `5` from the prior `set-qty` click), so the
   `=== '0'` branch never runs.
2. **The Promise is never awaited** — `act` returns immediately, the test
   "passes", but the interval keeps firing.
3. **It leaks across tests.** After `afterEach` cleanup tears down the DOM, the
   still-running interval calls `screen.getByTestId('cart-count')` against an
   empty body → `TestingLibraryElementError`, surfacing during a *later* test.
4. **It asserts nothing** — and `TestComponent` has no control that sets
   quantity to 0 (only `set-qty` → 5).

The test is both a no-op and the source of the error.

## Fix

Two coordinated edits.

### 1. Add a "set qty to 0" control to `TestComponent` (after the `set-qty` button, ~line 62)

```tsx
<button onClick={() => setQuantity('catalog-1', 'item-1', 0)} data-testid="set-qty-0">
  Set Qty to 0
</button>
```

### 2. Replace the broken test body (lines ~170–207)

```tsx
it('should remove item when quantity set to 0', async () => {
  renderWithProviders(<TestComponent />)

  const addBtn = screen.getByTestId('add-item')

  await act(async () => {
    addBtn.click()
  })

  await waitFor(() => {
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
  })

  await act(async () => {
    screen.getByTestId('set-qty-0').click()
  })

  await waitFor(() => {
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
    expect(screen.queryByTestId('item-item-1')).not.toBeInTheDocument()
  })
})
```

This exercises the documented `setQuantity` contract ("quantity ≤ 0 removes the
line"), asserts on it, and removes the leaking interval so the unhandled error
disappears. The duplicate `renderWithProviders(<TestComponent />)` from the
original (line ~193) is dropped — it only existed to feed the broken poll loop.

## Verify

```bash
npm run test
```

Expected: `Tests 123 passed`, **`Errors 0`** (no "Unhandled Errors" section).
