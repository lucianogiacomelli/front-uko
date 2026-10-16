import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import Categoria from './pages/Categoria'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Ofertas from './pages/Ofertas'
import Producto from './pages/Producto'
import Productos from './pages/Productos'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="productos" element={<Productos />} />
        <Route path="ofertas" element={<Ofertas />} />
        <Route path="categoria/:slug" element={<Categoria />} />
        <Route path="producto/:id" element={<Producto />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
