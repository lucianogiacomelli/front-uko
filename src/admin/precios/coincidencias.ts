// Comparación de nombres entre nuestro catálogo y la lista del proveedor.

const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'x'])

// "Medallón de durazno de 1ra" y "Medallón de durazno de 1°" quedan iguales
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d+)\s*(?:ra|ro|da|do|°|º)(?![a-z])/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Nombre preparado para comparar muchas veces sin recalcular
export type Firma = { clave: string; palabras: string[]; bigramas: Map<string, number>; totalBigramas: number }

export function firma(nombre: string): Firma {
  const clave = normalizar(nombre)
  const junto = clave.replace(/ /g, '')
  const bigramas = new Map<string, number>()
  for (let i = 0; i < junto.length - 1; i++) {
    const b = junto.slice(i, i + 2)
    bigramas.set(b, (bigramas.get(b) ?? 0) + 1)
  }
  return {
    clave,
    palabras: [...new Set(clave.split(' ').filter((p) => p && !VACIAS.has(p)))],
    bigramas,
    totalBigramas: Math.max(0, junto.length - 1),
  }
}

function diceBigramas(a: Firma, b: Firma): number {
  if (a.totalBigramas === 0 || b.totalBigramas === 0) return 0
  let comunes = 0
  for (const [bg, n] of a.bigramas) comunes += Math.min(n, b.bigramas.get(bg) ?? 0)
  return (2 * comunes) / (a.totalBigramas + b.totalBigramas)
}

// Similitud entre 0 y 1: pesa más que coincidan las palabras.
// Si todas las palabras de `a` (2 o más) están en `b`, cuenta alto aunque `b` agregue detalles
// ("Caldo vacuno" contra "Caldo vacuno, x 60 comprimidos").
export function similitud(a: Firma, b: Firma): number {
  if (a.palabras.length === 0 || b.palabras.length === 0) return 0
  const comunes = a.palabras.filter((p) => b.palabras.includes(p)).length
  const base = 0.6 * ((2 * comunes) / (a.palabras.length + b.palabras.length)) + 0.4 * diceBigramas(a, b)
  return a.palabras.length < 2 ? base : Math.max(base, (0.9 * comunes) / a.palabras.length)
}

// Los n elementos más parecidos a un nombre, de mayor a menor similitud
export function masParecidas<T extends { firma: Firma }>(buscado: Firma, lista: T[], n = 5): { item: T; puntaje: number }[] {
  return lista
    .map((item) => ({ item, puntaje: similitud(buscado, item.firma) }))
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, n)
}
