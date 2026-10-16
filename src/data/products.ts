import type { Product } from '../types/product'
import { catalogProducts } from './catalog'

// Catálogo hardcodeado (src/data/catalog.ts). Cuando esté el backend, reemplazar el cuerpo de fetchProducts.
export async function fetchProducts(): Promise<Product[]> {
  return catalogProducts
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
