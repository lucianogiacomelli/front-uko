import type { ItemCarrito } from '../carrito/CarritoContext'
import type { Product, Variante } from '../types/product'
import { price } from './format'
import { precioConOferta } from './ofertas'

export type LineaPedido = {
  productoId: string
  nombre: string
  imagen: string
  // Solo si el producto tiene varias presentaciones
  etiqueta?: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  disponible: boolean
}

// Presentación que se guarda en el carrito. Productos con una sola presentación no la llevan
export function etiquetaPara(p: Product, v?: Variante): string | undefined {
  return p.variantes.length > 1 ? v?.etiqueta : undefined
}

// Cruza las líneas del carrito con el catálogo, así el precio es el actual.
// Se descartan productos o presentaciones que ya no existen.
export function resolverLineas(items: ItemCarrito[], products: Product[]): LineaPedido[] {
  const porId = new Map(products.map((p) => [p.id, p]))
  return items.flatMap((item) => {
    const p = porId.get(item.productoId)
    if (!p) return []
    const variante = p.variantes.length > 1 ? p.variantes.find((v) => v.etiqueta === item.etiqueta) : p.variantes[0]
    if (!variante) return []
    const precioUnitario = precioConOferta(variante.precio, p)
    return [
      {
        productoId: p.id,
        nombre: p.nombre,
        imagen: p.imagen,
        etiqueta: etiquetaPara(p, variante),
        cantidad: item.cantidad,
        precioUnitario,
        subtotal: precioUnitario * item.cantidad,
        disponible: p.disponible && variante.disponible,
      },
    ]
  })
}

export function nombreLinea(l: Pick<LineaPedido, 'nombre' | 'etiqueta'>): string {
  return l.etiqueta ? `${l.nombre} (${l.etiqueta})` : l.nombre
}

// Mensaje del pedido. Se regenera con cada cambio en el carrito
export function armarMensaje(lineas: LineaPedido[]): string {
  const detalle = lineas.map(
    (l) =>
      `- ${nombreLinea(l)} x${l.cantidad}: ${price.format(l.precioUnitario)} c/u = ${price.format(l.subtotal)}${
        l.disponible ? '' : ' (sin stock)'
      }`,
  )
  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)
  return [
    'Hola, me gustaría realizar el siguiente pedido:',
    '',
    ...detalle,
    '',
    `Total: ${price.format(total)}`,
    '',
    'Gracias!',
  ].join('\n')
}

// Link de WhatsApp con el mensaje ya cargado. Sin número configurado, WhatsApp pide el destinatario
export function linkWhatsapp(texto: string, whatsapp: string): string {
  const base = whatsapp ? `https://wa.me/${whatsapp}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(texto)}`
}
