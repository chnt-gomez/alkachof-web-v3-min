import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RequestDetailDialog } from '@/sections/requests/components/RequestDetailDialog'
import type { ServiceRequestRow } from '@/sections/requests/types'
import { useOrdersFeed } from './hooks/useOrdersFeed'
import { useTransactionDeepLink } from './hooks/useTransactionDeepLink'
import { OrdersList } from './components/OrdersList'
import { TransactionDetailDialog } from './components/TransactionDetailDialog'
import type { TransactionRole, TransactionSummary } from './types'

/**
 * Ordered and colored to mirror the Home tabs: the seller's own side sits on the
 * left in the app's green, the buy side on the right in the buy signature color.
 * Same left/right, same two colors, so "which half am I looking at" reads the
 * same way on both screens.
 */
const ROLE_TABS: { value: TransactionRole; label: string; activeClass: string }[] = [
  { value: 'seller', label: 'Ventas', activeClass: 'bg-primary text-primary-foreground shadow-sm' },
  { value: 'buyer', label: 'Compras', activeClass: 'bg-buy text-buy-ink shadow-sm' },
]

/**
 * "Pedidos" — everything the user is on one side of, split only by role.
 * Product orders and service requests share the list: a request the user made
 * to another seller is a purchase, and one made to them is a sale.
 *
 * **No status filter in this MVP.** A user holds one or two rows at a time, so a
 * chip row filters nothing and costs a third of the screen on a phone. The
 * machinery behind it is intact and untouched — `StatusFilterChips`,
 * `orderStatusFilter.ts`, and `statusLabel`/`setStatusLabel` on `useOrdersFeed`
 * — so bringing it back is re-rendering one component here. Revisit when real
 * accounts carry enough history to need it.
 */
export function TransactionsPage() {
  const {
    role,
    setRole,
    statusLabel,
    status,
    partialError,
    rows,
    hasMore,
    loadingMore,
    loadMore,
    reload,
    patchTransaction,
    patchRequest,
    headerFor,
  } = useOrdersFeed()
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionSummary | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestRow | null>(null)
  const { highlightedId, registerCard } = useTransactionDeepLink({ role, setRole, status, rows })

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>

      <div role="tablist" aria-label="Tipo de pedido" className="flex gap-1 rounded-full bg-muted p-1">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={role === tab.value}
            onClick={() => setRole(tab.value)}
            className={cn(
              'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors',
              role === tab.value ? tab.activeClass : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <ListSkeleton />}
      {status === 'error' && <ListError onRetry={reload} />}
      {partialError && <PartialError onRetry={reload} />}
      {status === 'ready' &&
        (rows.length === 0 ? (
          <EmptyState role={role} filtered={statusLabel !== null} />
        ) : (
          <>
            <OrdersList
              rows={rows}
              role={role}
              onSelectTransaction={setSelectedTransaction}
              onSelectRequest={setSelectedRequest}
              headerFor={headerFor}
              highlightedId={highlightedId}
              registerCard={registerCard}
            />
            {hasMore && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </Button>
            )}
          </>
        ))}

      {selectedTransaction && (
        <TransactionDetailDialog
          transaction={selectedTransaction}
          role={role}
          header={headerFor(selectedTransaction)}
          onUpdated={patchTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {selectedRequest && (
        <RequestDetailDialog
          row={selectedRequest}
          role={role}
          onUpdated={(updated) => {
            patchRequest(updated)
            setSelectedRequest((prev) => (prev ? { ...prev, ...updated } : prev))
          }}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando pedidos">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm text-destructive">No pudimos cargar tus pedidos.</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function PartialError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3"
    >
      <p className="text-sm text-amber-900">
        No pudimos cargar parte de tus pedidos. Puede que falten algunos.
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function EmptyState({ role, filtered }: { role: TransactionRole; filtered: boolean }) {
  // A filtered-empty list is a different message from a genuinely empty one —
  // otherwise a chip that matches nothing reads as "you have no orders at all".
  const message = filtered
    ? 'No hay pedidos con este estado.'
    : role === 'buyer'
      ? 'Aún no has realizado compras ni solicitudes.'
      : 'Aún no has recibido ventas ni solicitudes.'

  return (
    <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}
