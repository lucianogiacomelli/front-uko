import type { Product } from '../types/product'

// Precio con el descuento de la oferta aplicado (redondeado a pesos).
// Si el producto no está en oferta, devuelve el mismo precio.
export function precioConOferta(precio: number, p: Pick<Product, 'enOferta' | 'descuento'>): number {
  if (!p.enOferta || p.descuento <= 0) return precio
  return Math.round((precio * (100 - p.descuento)) / 100)
}

export function enOferta(p: Product): boolean {
  return p.enOferta && p.descuento > 0
}
