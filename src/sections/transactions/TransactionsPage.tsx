import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RequestDetailDialog } from '@/sections/requests/components/RequestDetailDialog'
import type { ServiceRequestRow } from '@/sections/requests/types'
import { useOrdersFeed } from './hooks/useOrdersFeed'
import { useTransactionDeepLink } from './hooks/useTransactionDeepLink'
import { OrdersList } from './components/OrdersList'
import { TransactionDetailDialog } from './components/TransactionDetailDialog'
import type { OrdersScope, TransactionRole, TransactionSummary } from './types'

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
 *
 * **The list defaults to what is still happening.** The API drops finished
 * orders and ones untouched for five days out of the default feed, which is what
 * keeps this screen short without deleting anything (an order belongs to both
 * parties — one side clearing their view must not erase the other's record).
 * "Ver más antiguos" re-reads the same feed with archived rows included, and is
 * the only route to a completed order.
 */
export function TransactionsPage() {
  const {
    role,
    setRole,
    statusLabel,
    scope,
    setScope,
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
  const { highlightedId, registerCard } = useTransactionDeepLink({
    role,
    setRole,
    scope,
    setScope,
    status,
    rows,
  })

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <ScopeToggle scope={scope} onChange={setScope} />
      </div>

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
          <EmptyState
            role={role}
            filtered={statusLabel !== null}
            scope={scope}
            onShowHistory={() => setScope('history')}
          />
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
            {scope === 'active' && <ArchiveHint role={role} />}
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

/**
 * Standing footnote under a non-empty active list: whatever you cannot find is
 * probably archived, not gone.
 *
 * This is the safety net for every way a user can end up looking for a row that
 * is no longer in the default feed — a completed order, one untouched for five
 * days, or a notification tapped late whose deep link predates the state that
 * archived it. Rather than detect those cases (the last one cannot be detected
 * from here at all), the page says the same true thing every time, and the
 * wording deliberately echoes the header toggle's "Ver más antiguos" so the way
 * to act on it is already on screen.
 *
 * Only on the active feed: on the history there is nothing deeper to look in.
 * Only under a non-empty list: `EmptyState` already carries this message, with a
 * button, and would say it twice.
 */
function ArchiveHint({ role }: { role: TransactionRole }) {
  return (
    <p className="px-2 pt-1 text-center text-xs text-muted-foreground">
      Si no encuentras lo que estás buscando, es probable que se haya archivado en tus{' '}
      {role === 'buyer' ? 'compras' : 'ventas'} antiguas.
    </p>
  )
}

/**
 * Switches the whole feed between what is still happening and everything ever.
 * Deliberately a single button rather than a second row of tabs: the active list
 * is the answer nearly every time, and a phone has no room for two pill rows
 * stacked above the content.
 */
function ScopeToggle({
  scope,
  onChange,
}: {
  scope: OrdersScope
  onChange: (next: OrdersScope) => void
}) {
  const showingHistory = scope === 'history'
  return (
    <Button
      size="sm"
      variant={showingHistory ? 'secondary' : 'ghost'}
      onClick={() => onChange(showingHistory ? 'active' : 'history')}
      aria-pressed={showingHistory}
      className="shrink-0"
    >
      {showingHistory ? 'Regresar a recientes' : 'Ver más antiguos'}
    </Button>
  )
}

function EmptyState({
  role,
  filtered,
  scope,
  onShowHistory,
}: {
  role: TransactionRole
  filtered: boolean
  scope: OrdersScope
  onShowHistory: () => void
}) {
  // A filtered-empty list is a different message from a genuinely empty one —
  // otherwise a chip that matches nothing reads as "you have no orders at all".
  if (filtered) {
    return <EmptyMessage>No hay pedidos con este estado.</EmptyMessage>
  }

  // On the history there is genuinely nothing, ever — no point offering a way
  // to look deeper.
  if (scope === 'history') {
    return (
      <EmptyMessage>
        {role === 'buyer'
          ? 'Aún no has realizado compras ni solicitudes.'
          : 'Aún no has recibido ventas ni solicitudes.'}
      </EmptyMessage>
    )
  }

  // An empty *active* list is ambiguous: it means either "nothing yet" or
  // "everything you had is finished". The absolute wording used on the older
  // list ("aún no has recibido...") would be a plain lie for a user whose twenty
  // completed sales have all been archived — so this half says *activas*, and
  // points at the only place the rest can be seen, using the same words as the
  // header toggle.
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {role === 'buyer'
          ? 'No tienes compras ni solicitudes activas.'
          : 'No tienes ventas ni solicitudes activas.'}
      </p>
      <p className="text-xs text-muted-foreground">
        Los pedidos terminados y los que llevan días sin movimiento siguen guardados.
      </p>
      <Button size="sm" variant="outline" onClick={onShowHistory}>
        Ver más antiguos
      </Button>
    </div>
  )
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
