import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotFoundPage } from '@/components/NotFoundPage'
import { ToastProvider } from '@/components/ui/toast'
import { HomePage } from '@/sections/home/HomePage'
import { CatalogPage } from '@/sections/catalog/CatalogPage'
import { ProductPage } from '@/sections/product/ProductPage'
import { PublicCatalogPage } from '@/sections/publicCatalog/PublicCatalogPage'
import { ProfilePage } from '@/sections/profile/ProfilePage'
import { CartPage } from '@/sections/cart/CartPage'
import { TransactionsPage } from '@/sections/transactions/TransactionsPage'
import { LoginPage } from '@/sections/auth/LoginPage'
import { SignupPage } from '@/sections/auth/SignupPage'
import { RecoverPage } from '@/sections/auth/RecoverPage'
import { ResetPasswordPage } from '@/sections/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/sections/auth/VerifyEmailPage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { CartProvider } from '@/sections/cart/context/CartContext'
import { NavShell } from '@/components/NavShell'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/recover" element={<RecoverPage />} />
                <Route path="/reset/:token" element={<ResetPasswordPage />} />
                <Route path="/verify/:token" element={<VerifyEmailPage />} />
                <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
                <Route element={<NavShell />}>
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
