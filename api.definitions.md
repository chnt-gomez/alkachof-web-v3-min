# Alkachof API Definitions

Base URL: `http://localhost:3001`  
Spec: OpenAPI 3.0.0

> **Monetary Integer Rule:** All monetary fields (`price`, `totalPrice`) are integers in cents.  
> `100 = $1.00` | `1999 = $19.99` — never pass floats.

## Authentication

All protected endpoints require a Bearer JWT in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `POST` | `/signup` | No | Register a new user account |
| `POST` | `/login` | No | Authenticate and obtain JWT tokens |
| `POST` | `/refresh` | No | Exchange refresh token for a new token pair |
| `POST` | `/recover` | No | Initiate password recovery by email |
| `POST` | `/reset` | No | Set a new password using a recovery token |
| `GET` | `/validate/{token}` | No | Verify email address using token sent by email |

---

#### `POST /signup`
Register a new user. Account is pending email verification after creation.

**Request body** (`application/json`):
```json
{
  "email": "newuser@example.com",   // required
  "password": "secret123"           // required
}
```

**Responses:**
- `201` — User created. Returns `SignupResponse` (user pending verification).
- `500` — Email already registered or validation error.

---

#### `POST /login`
Authenticate a user and obtain JWT access + refresh tokens.

**Request body** (`application/json`):
```json
{
  "email": "user@example.com",   // required
  "password": "secret123"        // required
}
```

**Responses:**
- `200` — Returns `LoginResponse` with `token` and `refreshToken`.
- `400` — Missing or invalid credentials.
- `401` — Incorrect email or password.

---

#### `POST /refresh`
Exchange a valid refresh token for a new token pair.

**Request body** (`application/json`):
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."   // required
}
```

**Responses:**
- `200` — Returns new `token` and `refreshToken`.
- `400` — Refresh token missing.
- `401` — Refresh token invalid or expired.

---

#### `POST /recover`
Initiate password recovery. Always returns 200 to prevent email enumeration.

**Request body** (`application/json`):
```json
{
  "email": "user@example.com"   // required
}
```

**Responses:**
- `200` — Recovery email dispatched.
- `500` — Unexpected error.

---

#### `POST /reset`
Set a new password using a recovery token.

**Request body** (`application/json`):
```json
{
  "token": "abc123recoverytoken",   // required
  "password": "newSecret123"        // required
}
```

**Responses:**
- `200` — Password updated successfully.
- `500` — Token invalid, expired, or not found.

---

#### `GET /validate/{token}`
Verify a user's email address using the token from the registration email.

**Path params:** `token` — email verification token.

**Responses:**
- `200` — Email verified, account is now active.
- `401` — Token invalid or expired.

---

### Catalog

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/catalog` | Required | Get the authenticated user's own catalog |
| `POST` | `/catalog/new` | Required | Create a new catalog |
| `GET` | `/catalog/{catalogId}` | No | Get a catalog by ID (public) |
| `POST` | `/catalog/{catalogId}/update` | Required (owner) | Update catalog details |
| `GET` | `/catalog/{catalogId}/items` | No | Get all items in a catalog (public) |
| `POST` | `/catalog/{catalogId}/item/add` | Required (owner) | Add a new item to a catalog |
| `POST` | `/catalog/{catalogId}/broadcast` | Required (owner) | Send broadcast to all subscribers |
| `GET` | `/catalog/{catalogId}/subscribe` | Required | Subscribe to a catalog |
| `GET` | `/catalog/{catalogId}/unsubscribe` | Required | Unsubscribe from a catalog |
| `GET` | `/catalog/{catalogId}/subscribers` | Required (owner) | Get all catalog subscribers |

---

#### `GET /catalog`
Get the authenticated user's own catalog.

**Responses:**
- `200` — Returns `{ catalog: Catalog }`.
- `401` — Not authenticated.

---

#### `POST /catalog/new`
Create a new catalog for the authenticated user. Each user can only have one catalog.

**Request body** (`application/json`):
```json
{
  "welcomeText": "Bienvenidos!",          // required
  "payOptions": ["cash", "transfer"],     // required — enum: cash | credit | transfer | other
  "deliveryType": ["location-pickup"],    // required — enum: location-pickup | delivery | shipping
  "alias": "my-shop",
  "description": "Handmade goods from Oaxaca",
  "location": "Oaxaca, México",
  "locationZip": "68000",
  "deliveryDates": ["2024-12-20"]
}
```

**Responses:**
- `201` — Returns `{ message, catalog: Catalog }`.
- `401` — Not authenticated.
- `500` — User already has a catalog.

---

#### `GET /catalog/{catalogId}`
Get a catalog by ID. Public endpoint.

**Responses:**
- `200` — Returns `{ catalog: Catalog }`.
- `404` — Catalog not found.

---

#### `POST /catalog/{catalogId}/update`
Update a catalog's details. Owner only.

**Request body** (`application/json`): Same fields as `CreateCatalogRequest`, all optional.

**Responses:**
- `200` — Returns `{ message, catalog: Catalog }`.
- `401` — Not authenticated.
- `403` — Not the catalog owner.

---

#### `GET /catalog/{catalogId}/items`
Get all items listed in a catalog. Public endpoint.

**Responses:**
- `200` — Returns `{ items: Item[] }`.
- `500` — Unexpected error.

---

#### `POST /catalog/{catalogId}/item/add`
Add a new item to a catalog. Owner only. Uses `multipart/form-data` for image upload.

**Request body** (`multipart/form-data`):
```
name        string
description string
price       integer  (cents — 100 = $1.00)
stock       integer
sizes       string[]
image       binary   (file upload)
```

**Responses:**
- `201` — Returns `{ message, item: Item }`.
- `401` — Not authenticated.
- `403` — Not the catalog owner.

---

#### `POST /catalog/{catalogId}/broadcast`
Send a broadcast notification to all catalog subscribers. Owner only. Consumes broadcast credits from membership.

**Responses:**
- `200` — Broadcast sent.
- `401` — Not authenticated.
- `403` — Not the catalog owner.

---

#### `GET /catalog/{catalogId}/subscribe`
Subscribe the authenticated user to a catalog.

**Responses:**
- `200` — Returns `{ message, subscription: Subscription }`.
- `401` — Not authenticated.
- `500` — Already subscribed or own catalog.

---

#### `GET /catalog/{catalogId}/unsubscribe`
Unsubscribe the authenticated user from a catalog.

**Responses:**
- `200` — Returns `{ message }`.
- `401` — Not authenticated.
- `500` — Subscription not found.

---

#### `GET /catalog/{catalogId}/subscribers`
Get all subscribers of a catalog. Owner only.

**Responses:**
- `200` — Returns `{ subscribers: Subscription[] }`.
- `401` — Not authenticated.
- `403` — Not the catalog owner.

---

### Items

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/item/{itemId}` | No | Get a single item by ID |
| `POST` | `/item/{itemId}/update` | Required (owner) | Update an item |
| `POST` | `/item/{itemId}/delete` | Required (owner) | Soft-delete an item |
| `POST` | `/item/{itemId}/purchase` | Required | Purchase an item directly |

---

#### `GET /item/{itemId}`
Get a single item by its MongoDB ObjectId. Public.

**Responses:**
- `200` — Returns `{ item: Item }`.
- `404` — Item not found.

---

#### `POST /item/{itemId}/update`
Update an item. Owner only. Uses `multipart/form-data`.

**Request body** (`multipart/form-data`): All fields optional.
```
name        string
description string
price       integer  (cents)
stock       integer
sizes       string[]
image       binary
```

**Responses:**
- `201` — Returns `{ message, item: Item }`.
- `401` — Not authenticated.
- `403` — Not the item owner.

---

#### `POST /item/{itemId}/delete`
Soft-delete an item. Owner only.

**Responses:**
- `200` — Returns `{ message }`.
- `401` — Not authenticated.
- `403` — Not the item owner.

---

#### `POST /item/{itemId}/purchase`
Purchase an item directly (bypasses cart).

**Request body** (`application/json`):
```json
{
  "userId": "64a1b2c3d4e5f6a7b8c9d0e3",     // required
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2",   // required
  "quantity": 2                               // required
}
```

**Responses:**
- `201` — Returns `PurchaseResponse`.
- `400` — Invalid data (check monetary integer format).
- `401` — Not authenticated.

---

### Cart

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/cart` | Required | Get the authenticated user's cart |
| `POST` | `/cart/add` | Required | Add an item to the cart |
| `POST` | `/cart/remove` | Required | Remove an item from the cart |
| `POST` | `/cart/clear` | Required | Remove all items from the cart |
| `GET` | `/cart/checkout` | Required | Convert cart into purchases and clear it |

---

#### `GET /cart`
Get the authenticated user's cart.

**Responses:**
- `200` — Returns `{ cart: Cart }`.
- `401` — Not authenticated.

---

#### `POST /cart/add`
Add an item to the cart.

**Request body** (`application/json`):
```json
{
  "itemId": "64a1b2c3d4e5f6a7b8c9d0e1",   // required
  "quantity": 2                             // required
}
```

**Responses:**
- `201` — Returns `{ message, item: CartItem }`.
- `401` — Not authenticated.
- `500` — Item not found or cart not found.

---

#### `POST /cart/remove`
Remove an item from the cart.

**Request body** (`application/json`):
```json
{
  "itemId": "64a1b2c3d4e5f6a7b8c9d0e1"   // required
}
```

**Responses:**
- `200` — Returns `{ message, item: CartItem }`.
- `401` — Not authenticated.
- `500` — Cart or item not found.

---

#### `POST /cart/clear`
Remove all items from the cart.

**Responses:**
- `200` — Returns `{ message }`.
- `401` — Not authenticated.

---

#### `GET /cart/checkout`
Convert the cart into purchases and clear it.

**Responses:**
- `201` — Returns `{ message, purchase: object }`.
- `401` — Not authenticated.
- `500` — Cart empty or cart not found.

---

### Purchases

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/purchase/all` | Required | Get all purchases made by the user (buyer view) |
| `POST` | `/purchase/update` | Required (buyer) | Update a purchase status |

---

#### `GET /purchase/all`
Get all purchases made by the authenticated user as a buyer.

**Responses:**
- `200` — Returns `{ purchases: Purchase[] }`.
- `401` — Not authenticated.

---

#### `POST /purchase/update`
Update a purchase status. Buyer only. Restricted state transitions.

**Request body** (`application/json`):
```json
{
  "purchaseId": "64a1b2c3d4e5f6a7b8c9d0e6",   // required
  "status": "accepted"                          // required — see Purchase.status enum
}
```

**Responses:**
- `200` — Returns `{ message, purchase: Purchase }`.
- `401` — Not authenticated or not the buyer.
- `403` — Status transition not allowed.

---

### Sales

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/sales/all` | Required | Get all sales received by the user (seller view) |
| `POST` | `/sales/update` | Required (seller) | Update a sale status |

---

#### `GET /sales/all`
Get all sales received by the authenticated user as a seller.

**Responses:**
- `200` — Returns `{ purchases: Purchase[] }`.
- `401` — Not authenticated.

---

#### `POST /sales/update`
Update a sale status. Seller only. Restricted state transitions.

**Request body** (`application/json`): Same as `UpdatePurchaseRequest`.

**Responses:**
- `200` — Returns `{ message, purchase: Purchase }`.
- `401` — Not authenticated or not the seller.
- `403` — Status transition not allowed.

---

### Profile

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/profile` | Required | Get the authenticated user's own profile |
| `GET` | `/profile/{profileId}` | Required | Get a profile by ID |
| `POST` | `/profile/{profileId}/update` | Required (owner) | Update profile text fields |
| `POST` | `/profile/{profileId}/image` | Required (owner) | Update profile picture |

---

#### `GET /profile`
Get the authenticated user's own profile.

**Responses:**
- `200` — Returns `{ profile: Profile }`.
- `401` — Not authenticated.

---

#### `GET /profile/{profileId}`
Get a profile by its MongoDB ObjectId.

**Responses:**
- `200` — Returns `{ profile: Profile }`.
- `401` — Not authenticated.
- `500` — Profile not found.

---

#### `POST /profile/{profileId}/update`
Update profile text fields. Owner only.

**Request body** (`application/json`):
```json
{
  "profileDescription": "Seller of handmade goods",
  "alias": "artisan_mx",
  "phoneCountry": "+52",
  "phoneContact": "5512345678"
}
```

**Responses:**
- `200` — Returns `{ profile: Profile }`.
- `401` — Not authenticated.
- `403` — Not the profile owner.

---

#### `POST /profile/{profileId}/image`
Update profile picture. Owner only. Uses `multipart/form-data`.

**Request body** (`multipart/form-data`):
```
image   binary   (profile picture file)
```

**Responses:**
- `200` — Returns `{ profile: Profile }`.
- `401` — Not authenticated.
- `403` — Not the profile owner.

---

### Membership

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/membership` | Required | Get the authenticated user's membership details |

---

#### `GET /membership`
Get membership details including type and broadcast credits.

**Responses:**
- `200` — Returns `{ membership: Membership }`.
- `401` — Not authenticated.
- `500` — Unexpected error.

---

### Notifications

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `GET` | `/notification/recent` | Required | Get recent (unread) notifications |
| `GET` | `/notification/all` | Required | Get full notification history |

---

#### `GET /notification/recent`
Get the authenticated user's unread notifications.

**Responses:**
- `200` — Returns `{ notifications: Notification[] }`.
- `401` — Not authenticated.

---

#### `GET /notification/all`
Get the full notification history for the authenticated user.

**Responses:**
- `200` — Returns `{ notifications: Notification[] }`.
- `401` — Not authenticated.

---

### Subscriptions

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| `POST` | `/subscription/subscribe` | Required | Subscribe to a catalog |
| `POST` | `/subscription/unsubscribe` | Required | Unsubscribe from a catalog |
| `GET` | `/subscription/user` | Required | Get all subscriptions for the user |
| `GET` | `/subscription/catalog/{catalogId}` | Required (owner) | Get all subscribers of a catalog |

---

#### `POST /subscription/subscribe`
Subscribe the authenticated user to a catalog.

**Request body** (`application/json`):
```json
{
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2"   // required
}
```

**Responses:**
- `201` — Returns `{ message, subscription: Subscription }`.
- `401` — Not authenticated.
- `500` — Already subscribed, own catalog, or catalog not found.

---

#### `POST /subscription/unsubscribe`
Unsubscribe the authenticated user from a catalog.

**Request body** (`application/json`):
```json
{
  "catalogId": "64a1b2c3d4e5f6a7b8c9d0e2"   // required
}
```

**Responses:**
- `200` — Returns `{ message }`.
- `401` — Not authenticated.
- `500` — Subscription not found.

---

#### `GET /subscription/user`
Get all catalog subscriptions for the authenticated user.

**Responses:**
- `200` — Returns `{ subscriptions: Subscription[] }`.
- `401` — Not authenticated.

---

#### `GET /subscription/catalog/{catalogId}`
Get all subscribers of a catalog. Owner only.

**Responses:**
- `200` — Returns `{ subscriptions: Subscription[] }`.
- `401` — Not authenticated.
- `403` — Not the catalog owner.

---

## Models / Schemas

### User
```ts
{
  _id:     string          // MongoDB ObjectId
  email:   string (email)
  status:  "active" | "inactive" | "banned" | "pending-registration"
  type:    "admin" | "user"
  created: string (date-time)
}
```

### Profile
```ts
{
  _id:                 string   // MongoDB ObjectId
  userId:              string
  profileDescription:  string
  alias:               string
  phoneCountry:        string   // e.g. "+52"
  phoneContact:        string
  phoneValidation:     boolean
  profile_picture_url: string
}
```

### Catalog
```ts
{
  _id:               string   // MongoDB ObjectId
  userId:            string
  alias:             string
  welcomeText:       string
  description:       string
  payOptions:        Array<"cash" | "credit" | "transfer" | "other">
  deliveryType:      Array<"location-pickup" | "delivery" | "shipping">
  location:          string
  locationZip:       string
  deliveryDates:     string[]  // ISO date strings
  deliveryLocations: object[]
}
```

### Item
```ts
{
  _id:         string          // MongoDB ObjectId
  name:        string
  description: string
  price:       integer         // cents — 100 = $1.00
  stock:       integer
  imgPath:     string          // CDN URL
  sizes:       string[]        // e.g. ["S", "M", "L", "XL"]
  updatedOn:   string (date-time)
  catalogId:   string
}
```

### Cart
```ts
{
  _id:        string      // MongoDB ObjectId
  userId:     string
  items:      CartItem[]
  totalPrice: integer     // cents — sum of all items
}
```

### CartItem
```ts
{
  itemId:   string    // MongoDB ObjectId
  quantity: integer
}
```

### Purchase
```ts
{
  _id:        string   // MongoDB ObjectId
  item:       string   // item ObjectId
  buyer:      string   // user ObjectId
  seller:     string   // user ObjectId
  status:     "new" | "accepted" | "rejected" | "in_transit" | "completed" | "delayed" | "canceled" | "returned"
  createdAt:  string (date-time)
  expiresAt:  string (date-time)
  sellerNote: string
  buyerNote:  string
}
```

### Membership
```ts
{
  _id:                           string   // MongoDB ObjectId
  userId:                        string
  membershipType:                "free" | "premium" | "early-tester" | "promoter"
  broadcastCredits:              integer
  broadcastAvailabilityCooldown: string (date-time)
}
```

### Notification
```ts
{
  _id:                       string   // MongoDB ObjectId
  userId:                    string
  notificationType:          "message" | "catalog-update" | "other"
  notificationAssociatedId:  string   // related entity ObjectId
  notificationTitle:         string
  notificationDescription:   string
  notificationStatus:        "unread" | "read"
  notificationDate:          string (date-time)
}
```

### Subscription
```ts
{
  _id:       string   // MongoDB ObjectId
  userId:    string
  catalogId: string
}
```

### ErrorResponse
```ts
{
  error: {
    message: string
  }
}
```
