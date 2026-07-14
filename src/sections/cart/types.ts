export type CartLine = {
  itemId: string
  quantity: number
}

export type Cart = {
  id: string
  ownerId: string
  catalogId: string
  items: CartLine[]
  discountCodeApplied: string | null
}

export type Transaction = {
  id: string
  purchaseIds: string[]
  buyerId: string
  sellerId: string
  status: 'STARTED' | 'REJECTED' | 'PROCESSING' | 'READY-FOR-PICKUP' | 'EN-ROUTE' | 'DELIVERED' | 'RETURNED'
  dateCreated: string
  dateUpdated: string
}

export type CheckoutResult = {
  purchases: string[]
  transaction: Transaction
}
