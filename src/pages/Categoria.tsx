import { Link, useParams } from 'react-router'
import Container from '../components/Container'
import ProductGrid from '../components/ProductGrid'
import SectionHead from '../components/SectionHead'
import { useProducts } from '../data/useProducts'

export default function Categoria() {
  const { slug } = useParams()
  const { products, categorias, loading, error } = useProducts()
  const items = products.filter((p) => p.categoriaId === slug)
  const categoria = categorias.find((c) => c.id === slug)

  return (
    <Container>
      <Link to="/productos" className="mb-4 inline-block text-sm font-bold text-verde hover:underline">
        ← Todos los productos
      </Link>
      <SectionHead kicker="Categoría" title={categoria?.nombre ?? 'Categoría'} />

      {loading && <p>Cargando…</p>}
      {error && <p>{error}</p>}
      {!loading && !error && <ProductGrid products={items} />}
    </Container>
  )
}
