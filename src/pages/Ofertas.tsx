import { useMemo } from 'react'
import Container from '../components/Container'
import ProductGrid from '../components/ProductGrid'
import { enOferta } from '../data/ofertas'
import { useProducts } from '../data/useProducts'

// Productos marcados como oferta, con el mayor descuento primero
export default function Ofertas() {
  const { products, loading, error } = useProducts()
  const ofertas = useMemo(
    () => products.filter(enOferta).sort((a, b) => b.descuento - a.descuento),
    [products],
  )

  return (
    <Container>
      <div className="fade-up mb-6 rounded-2xl border border-bordo/15 bg-bordo p-5 text-crema sm:p-6">
        <span className="kicker text-crema/70">Promociones</span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Ofertas</h1>
        {!loading && !error && (
          <p className="mt-1 text-sm font-medium text-crema/80">
            {ofertas.length} {ofertas.length === 1 ? 'producto en oferta' : 'productos en oferta'}
          </p>
        )}
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p>{error}</p>}
      {!loading && !error && ofertas.length === 0 && (
        <p className="text-bordo/70">No hay ofertas por ahora.</p>
      )}
      {!loading && !error && ofertas.length > 0 && <ProductGrid products={ofertas} />}
    </Container>
  )
}
