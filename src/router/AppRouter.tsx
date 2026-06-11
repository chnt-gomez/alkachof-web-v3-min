import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '@/sections/home/HomePage'
import { CatalogPage } from '@/sections/catalog/CatalogPage'
import { ProductPage } from '@/sections/product/ProductPage'
import { PublicCatalogPage } from '@/sections/publicCatalog/PublicCatalogPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/edit/catalog/:catalogId" element={<CatalogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
