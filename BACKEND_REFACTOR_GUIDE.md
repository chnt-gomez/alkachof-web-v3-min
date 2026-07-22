# Backend Refactoring Guide: Shopping Cart Client-Side Migration

## Overview

The frontend shopping cart has been refactored to be **entirely client-side** using `localStorage`. This eliminates backend API calls for cart operations (add, remove, update). **Only checkout now talks to the backend.**

This document outlines the backend changes required to support this new architecture.

---

## What Changed on Frontend

### Before
- Cart operations: `POST /cart/add`, `POST /cart/remove`, `PATCH /cart/:itemId`
- Backend maintained cart state per user
- Checkout read from server-side cart

### After
- **No cart API endpoints needed** (add, remove, update removed)
- Frontend stores cart in `localStorage` as `Record<string, CartLine[]>`
- Frontend sends complete cart state **directly to checkout**
- Checkout is the only backend integration point

---

## Cart Data Structure (Frontend → Backend)

### CartLine (sent to backend during checkout)
```typescript
interface CartLine {
  itemId: string        // product _id
  quantity: number
  name: string          // product name
  price: number         // cents (e.g. 1500 = $15.00 MXN)
  imgPath: string       // product image path
  stock: number         // original product stock (for validation)
}
```

### Checkout Request Body (NEW FORMAT)
```typescript
// POST /transaction/checkout (or existing checkout endpoint)
interface CheckoutRequest {
  catalogId: string
  items: CartLine[]     // Full cart contents from client
}
```

**Key difference:** Backend no longer queries a user's cart state; client sends the complete cart contents.

---

## Endpoints to Remove/Deprecate

These endpoints are **no longer called by the frontend** and can be deprecated or removed:

| Endpoint | Method | Status | Reason |
|----------|--------|--------|--------|
| `/cart` | `GET` | ❌ Remove | Frontend maintains cart locally |
| `/cart/add` | `POST` | ❌ Remove | Client-side operation only |
| `/cart/:itemId` | `DELETE` | ❌ Remove | Client-side operation only |
| `/cart/:itemId` | `PATCH` | ❌ Remove | Client-side operation only |
| `/cart/checkout` | `POST` | ⚠️ Update | Must accept `CartLine[]` from client |

---

## Endpoints to Update

### POST /transaction/checkout (or /cart/checkout)

**Current behavior (assumed):**
- Expects `cartId` or reads from user session cart
- Backend fetches cart items from database
- Processes items and creates transaction

**New behavior required:**
- Accept complete `items: CartLine[]` array from client
- Validate items against product DB (stock, prices, etc.)
- Create transaction with provided items
- Return transaction confirmation

**New Request/Response Signature:**

```typescript
POST /transaction/checkout

Request Body:
{
  catalogId: string,
  items: CartLine[]
}

Example:
{
  "catalogId": "6a0365fdf74fdcb617a8a5b6",
  "items": [
    {
      "itemId": "item-1",
      "quantity": 2,
      "name": "Product A",
      "price": 1500,
      "imgPath": "/images/product-a.jpg",
      "stock": 10
    },
    {
      "itemId": "item-2",
      "quantity": 1,
      "name": "Product B",
      "price": 2000,
      "imgPath": "/images/product-b.jpg",
      "stock": 5
    }
  ]
}

Response (200):
{
  "id": "txn-123",
  "status": "confirmed",
  "total": 5000,          // cents
  "items": [...],
  "createdAt": "2026-07-21T..."
}

Error (400):
{
  "error": "Stock unavailable for item 'item-1'"
}
```

---

## Backend Validation Requirements

When checkout is called, the backend **must validate** client-provided cart data:

### 1. **Stock Validation**
   - For each `CartLine`, verify `item.quantity ≤ current_product.stock`
   - If insufficient stock: return error with item details
   - Consider: concurrent orders → use pessimistic locking or atomic updates

### 2. **Price Validation**
   - Verify each `CartLine.price` matches current product price
   - If price changed: decide policy:
     - Reject the order? 
     - Update to current price and notify?
     - Lock prices during checkout?
   - Document the chosen policy

### 3. **Product Existence**
   - Verify each `itemId` exists in the catalog
   - Verify catalog ownership (buyer ordering from seller's catalog)

### 4. **Catalog Ownership**
   - Verify `catalogId` belongs to the seller
   - Verify requester is not the catalog owner (can't buy from self)

---

## Migration Strategy

### Phase 1: Dual Support (Recommended)
1. Keep old cart endpoints but mark as deprecated
2. Update checkout to accept both:
   - Old format (read from server cart): `{ cartId?: string }`
   - New format (client-provided items): `{ items: CartLine[], catalogId: string }`
3. Detect format and route accordingly
4. Log which clients use each format for monitoring

### Phase 2: Gradual Deprecation
- Monitor logs; frontend always uses new format
- Set deadline for old format removal
- Return 410 Gone for old endpoints after deadline

### Phase 3: Cleanup
- Remove old cart endpoints
- Simplify checkout to assume client-provided items only

---

## Mock Data & Testing

### Frontend Mock (unchanged)
Frontend dev mode mocks checkout at `src/mocks/mockCheckoutCart.ts`. Backend should support real checkout endpoint for integration tests.

### Backend Test Scenarios
Ensure checkout handles:
1. ✅ Valid cart → creates transaction
2. ❌ Empty items array → error
3. ❌ Out-of-stock item → error with item name
4. ❌ Price mismatch → error (or handled per policy)
5. ❌ Duplicate itemIds → error or merge?
6. ✅ Multiple items, different quantities
7. ✅ Very large quantities
8. ✅ Concurrent checkout (same catalog, different users)

---

## Database Implications

### Old Cart Table/Collection
If backend had a `carts` collection per user, it can now be:
- ✅ **Deprecated** (no new writes; old data unused)
- ✅ **Archived** (keep for audit; users can't modify)
- ✅ **Deleted** (if no compliance/audit requirement)

### Transaction/Order Table
- No change to structure
- Update checkout handler to accept and store client-provided items
- Ensure audit trail captures item prices/quantities at time of order

---

## API Documentation Updates

Update your Swagger/OpenAPI docs:

```yaml
paths:
  /transaction/checkout:
    post:
      summary: Checkout shopping cart
      description: >
        Create a transaction from a complete cart state sent by the client.
        Frontend no longer maintains server-side cart; this endpoint receives 
        full item list and performs server-side validation.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - catalogId
                - items
              properties:
                catalogId:
                  type: string
                  description: Seller's catalog ID
                items:
                  type: array
                  description: Complete cart contents
                  items:
                    $ref: '#/components/schemas/CartLine'
      responses:
        '200':
          description: Transaction created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Transaction'
        '400':
          description: Validation failed (stock, price, etc.)
        '401':
          description: Unauthorized
      deprecated: false

components:
  schemas:
    CartLine:
      type: object
      required:
        - itemId
        - quantity
        - name
        - price
      properties:
        itemId:
          type: string
        quantity:
          type: integer
          minimum: 1
        name:
          type: string
        price:
          type: integer
          description: Price in cents
        imgPath:
          type: string
        stock:
          type: integer
          description: Original product stock (for validation)
```

---

## Implementation Checklist

- [ ] **Update checkout endpoint** to accept `CartLine[]` in request body
- [ ] **Add validation logic** for stock, price, product existence
- [ ] **Remove/deprecate** old cart CRUD endpoints (`/cart/add`, `/cart/:id`, etc.)
- [ ] **Update API docs** with new checkout signature
- [ ] **Test checkout** with various cart scenarios (empty, out-of-stock, etc.)
- [ ] **Add logging** to distinguish old vs new checkout format (if dual-support)
- [ ] **Update transaction** records to reflect client-provided cart items
- [ ] **Plan cart table deprecation** (archive, delete, or keep as-is)
- [ ] **Notify mobile/web clients** of endpoint removals (if applicable)
- [ ] **Monitor production** for checkout errors during rollout

---

## FAQ

**Q: What if a product's price changes between when the user adds it and checkout?**
A: Backend must validate. Recommend: reject if price changed, show user the new price and ask them to re-add. Or update the price and notify (risky).

**Q: What about concurrent checkouts for the same catalog?**
A: Backend must handle atomically (lock or optimistic concurrency). Each checkout decrements stock; validate before committing.

**Q: Can users manipulate quantities in localStorage?**
A: Yes. Frontend validation is client-side only. Backend **must** validate all quantities and prices during checkout.

**Q: What if a user has an old cart in localStorage and the API changes?**
A: Frontend localStorage persists locally. When checkout is called, if API rejects the format, the client gets an error. No cross-device sync, so each device's cart is independent.

**Q: Do we need to notify the seller in real-time as items are added to cart?**
A: No longer needed. Cart is client-side. Seller only gets notified on checkout (transaction created).

---

## Related Frontend Code

For reference, the frontend implementation:
- **CartContext** (`src/sections/cart/context/CartContext.tsx`) — manages client-side cart
- **CartDrawer** (`src/sections/cart/components/CartDrawer.tsx`) — renders cart UI
- **checkoutCartAction** (`src/sections/cart/actions/checkoutCart.ts`) — calls `/transaction/checkout`

See `CLAUDE.md` for full frontend architecture.
