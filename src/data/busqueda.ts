import type { Product } from '../types/product'
import { slugify } from './products'

// Sin tildes, mayúsculas ni signos: "Aceite de Coco" -> "aceite de coco"
export const normalizarBusqueda = (s: string) => slugify(s).replace(/-/g, ' ')

// Coincide si cada palabra buscada es el comienzo de alguna palabra del nombre, la categoría o las etiquetas,
// en cualquier orden: "aceite coco" encuentra "Aceite de coco Neutro" y "coc" ya lo encuentra mientras se escribe,
// pero "mani" no trae "yamani"
export function coincide(p: Product, busqueda: string): boolean {
  const palabras = normalizarBusqueda(busqueda).split(' ').filter(Boolean)
  if (palabras.length === 0) return true
  const texto = ` ${normalizarBusqueda(`${p.nombre} ${p.categoria} ${p.etiquetas.join(' ')}`)}`
  return palabras.every((w) => texto.includes(` ${w}`))
}

// Para las sugerencias: primero los nombres que empiezan con lo buscado,
// después los que lo tienen en el nombre y al final los que coinciden por categoría o etiqueta
export function buscarProductos(products: Product[], busqueda: string): Product[] {
  const buscado = normalizarBusqueda(busqueda)
  if (!buscado) return []
  const orden = (p: Product) => {
    const nombre = normalizarBusqueda(p.nombre)
    if (nombre.startsWith(buscado)) return 0
    if (nombre.includes(buscado)) return 1
    return 2
  }
  return products
    .filter((p) => coincide(p, busqueda))
    .map((p) => ({ p, o: orden(p) }))
    .sort((a, b) => a.o - b.o || a.p.nombre.localeCompare(b.p.nombre, 'es'))
    .map(({ p }) => p)
}
