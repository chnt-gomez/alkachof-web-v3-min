import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '@/sections/home/HomePage'
import { CatalogPage } from '@/sections/catalog/CatalogPage'
import { ProductPage } from '@/sections/product/ProductPage'
import { PublicCatalogPage } from '@/sections/publicCatalog/PublicCatalogPage'
import { ProfilePage } from '@/sections/profile/ProfilePage'
import { LoginPage } from '@/sections/auth/LoginPage'
import { SignupPage } from '@/sections/auth/SignupPage'
import { AuthProvider } from '@/sections/auth/AuthContext'
import { NavShell } from '@/components/NavShell'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
          <Route element={<NavShell />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/edit/catalog/:catalogId" element={<CatalogPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
