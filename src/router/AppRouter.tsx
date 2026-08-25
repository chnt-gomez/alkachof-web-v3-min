import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotFoundPage } from '@/components/NotFoundPage'
import { ToastProvider } from '@/components/ui/toast'
import { HomePage } from '@/sections/home/HomePage'
import { CatalogPage } from '@/sections/catalog/CatalogPage'
import { ProductPage } from '@/sections/product/ProductPage'
import { PublicCatalogPage } from '@/sections/publicCatalog/PublicCatalogPage'
import { ProfilePage } from '@/sections/profile/ProfilePage'
import { TransactionsPage } from '@/sections/transactions/TransactionsPage'
import { ChatListPage } from '@/sections/chat/ChatListPage'
import { ChatThreadPage } from '@/sections/chat/ChatThreadPage'
import { LoginPage } from '@/sections/auth/LoginPage'
import { SignupPage } from '@/sections/auth/SignupPage'
import { RecoverPage } from '@/sections/auth/RecoverPage'
import { ResetPasswordPage } from '@/sections/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/sections/auth/VerifyEmailPage'
import { AboutPage } from '@/sections/about/AboutPage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NotificationsProvider } from '@/sections/notifications/context/NotificationsContext'
import { ChatProvider } from '@/sections/chat/context/ChatContext'
import { CartProvider } from '@/sections/cart/context/CartContext'
import { NavShell } from '@/components/NavShell'
import { ProtectedRoute } from './ProtectedRoute'

/** Retired route: forward to Pedidos, keeping `?highlight=` and `?role=`. */
function RequestsRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/transactions${search}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <NotificationsProvider>
              <ChatProvider>
                <CartProvider>
                  <Routes>
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/recover" element={<RecoverPage />} />
                  <Route path="/reset/:token" element={<ResetPasswordPage />} />
                  <Route path="/verify/:token" element={<VerifyEmailPage />} />
                  <Route element={<NavShell />}>
                    {/* Public: the visitor view of a catalog shares the app header
                        (guest variant) but is not behind ProtectedRoute. */}
                    <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/product/:id" element={<ProductPage />} />
                      <Route path="/catalog" element={<CatalogPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/transactions" element={<TransactionsPage />} />
                      {/* Notifications stored before 2026-08-25 point service
                          requests at a "/requests" page that never shipped —
                          requests live in Pedidos. Alias it so those keep working. */}
                      <Route path="/requests" element={<RequestsRedirect />} />
                      <Route path="/chats" element={<ChatListPage />} />
                    </Route>
                  </Route>
                  {/* Full-screen conversation view — outside NavShell (no bottom tabs).
                      `/chats/new` is the unsaved draft; the static segment wins over
                      the `:chatId` param so a real chat id never collides with it. */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/chats/new" element={<ChatThreadPage />} />
                    <Route path="/chats/:chatId" element={<ChatThreadPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </CartProvider>
              </ChatProvider>
            </NotificationsProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
