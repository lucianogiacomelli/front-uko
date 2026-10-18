import { createContext, useContext } from 'react'

// Una línea del carrito. Solo guarda la referencia y la cantidad:
// nombre y precio se leen del catálogo al mostrar, así siempre están al día.
export type ItemCarrito = {
  productoId: string
  // Presentación elegida (ej. "100 g"). Vacía si el producto tiene una sola
  etiqueta?: string
  cantidad: number
}

export type CarritoContextValue = {
  items: ItemCarrito[]
  cantidadTotal: number
  agregar: (productoId: string, etiqueta: string | undefined, cantidad: number) => void
  // Cantidad 0 o menos quita la línea
  cambiarCantidad: (productoId: string, etiqueta: string | undefined, cantidad: number) => void
  quitar: (productoId: string, etiqueta: string | undefined) => void
  vaciar: () => void
}

export const CarritoContext = createContext<CarritoContextValue | null>(null)

export function useCarrito() {
  const ctx = useContext(CarritoContext)
  if (!ctx) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return ctx
}
