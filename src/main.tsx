import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ProductDetailScreen } from './sections/product_detail/ProductDetailScreen.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProductDetailScreen />
  </StrictMode>,
)
