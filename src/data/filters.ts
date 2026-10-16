export type Rango = 'todos' | 'hasta10' | 'hasta25' | 'mas25'

export const RANGOS: { value: Rango; label: string }[] = [
  { value: 'todos', label: 'Todos los precios' },
  { value: 'hasta10', label: 'Hasta $10.000' },
  { value: 'hasta25', label: '$10.000 a $25.000' },
  { value: 'mas25', label: 'Más de $25.000' },
]

// Precio "desde" del producto dentro del rango elegido
export function enRango(precio: number, r: Rango): boolean {
  if (r === 'hasta10') return precio <= 10000
  if (r === 'hasta25') return precio > 10000 && precio <= 25000
  if (r === 'mas25') return precio > 25000
  return true
}
