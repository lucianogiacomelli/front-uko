import { useEffect, useState } from 'react'
import type { Product } from '../types/product'
import { fetchProducts } from './products'

// Module-level cache so navigating between pages does not refetch the sheet.
let cache: Promise<Product[]> | null = null

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cache ??= fetchProducts()
    cache
      .then(setProducts)
      .catch((e: Error) => {
        cache = null
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return { products, loading, error }
}
