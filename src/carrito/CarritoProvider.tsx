import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CarritoContext, type CarritoContextValue, type ItemCarrito } from './CarritoContext'

const STORAGE_KEY = 'uko-carrito'

// Lee el carrito guardado en el navegador. Si está roto o no hay acceso, arranca vacío.
function leerCarrito(): ItemCarrito[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (i): i is ItemCarrito => typeof i?.productoId === 'string' && typeof i?.cantidad === 'number' && i.cantidad > 0,
    )
  } catch {
    return []
  }
}

const mismaLinea = (i: ItemCarrito, productoId: string, etiqueta: string | undefined) =>
  i.productoId === productoId && i.etiqueta === etiqueta

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>(leerCarrito)

  // Guarda cada cambio. Si el navegador bloquea el storage, el carrito sigue funcionando hasta recargar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // sin storage: solo se pierde al recargar
    }
  }, [items])

  const agregar = useCallback<CarritoContextValue['agregar']>((productoId, etiqueta, cantidad) => {
    setItems((prev) =>
      prev.some((i) => mismaLinea(i, productoId, etiqueta))
        ? prev.map((i) => (mismaLinea(i, productoId, etiqueta) ? { ...i, cantidad: i.cantidad + cantidad } : i))
        : [...prev, { productoId, etiqueta, cantidad }],
    )
  }, [])

  const cambiarCantidad = useCallback<CarritoContextValue['cambiarCantidad']>((productoId, etiqueta, cantidad) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => !mismaLinea(i, productoId, etiqueta))
        : prev.map((i) => (mismaLinea(i, productoId, etiqueta) ? { ...i, cantidad } : i)),
    )
  }, [])

  const quitar = useCallback<CarritoContextValue['quitar']>((productoId, etiqueta) => {
    setItems((prev) => prev.filter((i) => !mismaLinea(i, productoId, etiqueta)))
  }, [])

  const vaciar = useCallback(() => setItems([]), [])

  const value = useMemo<CarritoContextValue>(
    () => ({
      items,
      cantidadTotal: items.reduce((sum, i) => sum + i.cantidad, 0),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
    }),
    [items, agregar, cambiarCantidad, quitar, vaciar],
  )

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}
