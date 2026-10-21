import { useEffect, useState } from 'react'
import type { Categoria, Product } from '../types/product'
import { fetchCategorias, fetchProducts } from './products'

type Catalogo = { products: Product[]; categorias: Categoria[] }

// Module-level cache so navigating between pages does not refetch the catalog.
let cache: Promise<Catalogo> | null = null

// El admin la llama después de cada cambio para que la tienda vuelva a leer el catálogo
export function invalidarProductos() {
  cache = null
}

async function fetchCatalogo(): Promise<Catalogo> {
  const [products, categorias] = await Promise.all([fetchProducts(), fetchCategorias()])
  return { products, categorias }
}

export function useProducts() {
  const [catalogo, setCatalogo] = useState<Catalogo>({ products: [], categorias: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cache ??= fetchCatalogo()
    cache
      .then(setCatalogo)
      .catch((e: Error) => {
        cache = null
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return { ...catalogo, loading, error }
}
