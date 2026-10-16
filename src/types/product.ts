// Una presentación del producto (ej. 250 gr, 500 gr) con su precio
export interface Variante {
  etiqueta: string
  precio: number
  disponible: boolean
}

export interface Product {
  id: string
  nombre: string
  categoria: string
  // Precio más bajo entre las variantes (se muestra como "Desde")
  precio: number
  descripcion: string
  imagen: string
  etiquetas: string[]
  disponible: boolean
  variantes: Variante[]
  // Si está en oferta, aparece también en la pestaña Ofertas
  enOferta: boolean
  // Porcentaje de descuento (0-100), solo aplica si enOferta es true
  descuento: number
}
