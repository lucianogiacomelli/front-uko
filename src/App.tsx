import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { CarritoProvider } from './carrito/CarritoProvider'
import Layout from './components/Layout'
import Carrito from './pages/Carrito'
import Categoria from './pages/Categoria'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Ofertas from './pages/Ofertas'
import Producto from './pages/Producto'
import Productos from './pages/Productos'

// El panel se carga aparte: los visitantes de la tienda no descargan su código
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <CarritoProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="productos" element={<Productos />} />
          <Route path="ofertas" element={<Ofertas />} />
          <Route path="carrito" element={<Carrito />} />
          <Route path="categoria/:slug" element={<Categoria />} />
          <Route path="producto/:id" element={<Producto />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </CarritoProvider>
  )
}
