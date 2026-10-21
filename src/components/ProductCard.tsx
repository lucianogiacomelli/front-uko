import { useState } from 'react'
import { Link } from 'react-router'
import { useCarrito } from '../carrito/CarritoContext'
import { price } from '../data/format'
import { enOferta, precioConOferta } from '../data/ofertas'
import type { Product } from '../types/product'

type Props = { product: Product; showCategory?: boolean }

export default function ProductCard({ product, showCategory = true }: Props) {
  const { agregar } = useCarrito()
  const [agregado, setAgregado] = useState(false)
  const oferta = enOferta(product)
  const precioFinal = precioConOferta(product.precio, product)
  // Con varias presentaciones hay que elegir en el detalle; con una sola se suma desde acá
  const conPresentaciones = product.variantes.length > 1
  const puedeSumar = !conPresentaciones && product.disponible

  function sumar() {
    agregar(product.id, undefined, 1)
    setAgregado(true)
    window.setTimeout(() => setAgregado(false), 1200)
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-linea bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(71,14,18,0.12)]">
      {oferta && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-bordo px-3 py-1 text-xs font-extrabold text-crema shadow-md">
          −{product.descuento}% OFF
        </span>
      )}

      {/* El link cubre toda la tarjeta (::after); el botón de sumar va por encima */}
      <Link
        to={`/producto/${product.id}`}
        className="flex flex-1 flex-col after:absolute after:inset-0 after:content-['']"
      >
        {/* overflow-hidden: sin esto una foto vertical estira el recuadro más allá de 4:3.
            La foto se centra con su tamaño propio para que las esquinas redondeadas caigan sobre ella */}
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white p-4">
          {product.imagen ? (
            <img
              src={product.imagen}
              alt={product.nombre}
              loading="lazy"
              className="max-h-full max-w-full rounded-xl object-contain transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-crema-claro">
              <img src="/brand/isotipo-k.png" alt="" className="h-1/2 w-1/2 object-contain opacity-30 mix-blend-multiply" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-4 pt-1 pb-3">
          {showCategory && <span className="kicker !text-[10px] text-verde">{product.categoria}</span>}
          <h3 className="text-[15px] leading-snug font-extrabold">{product.nombre}</h3>
        </div>
      </Link>

      {/* Precio y acción: pointer-events-none deja pasar el clic al link; solo el botón lo captura */}
      <div className="pointer-events-none flex items-end justify-between gap-2 px-4 pb-4">
        <div>
          {conPresentaciones && <p className="text-[11px] font-bold tracking-wide text-bordo/60 uppercase">Desde</p>}
          {oferta && <p className="text-xs font-semibold text-bordo/50 line-through">{price.format(product.precio)}</p>}
          <p className={`text-lg font-extrabold ${oferta ? 'text-verde' : ''}`}>{price.format(precioFinal)}</p>
          {!product.disponible && <span className="text-xs font-medium text-bordo/60">Sin stock</span>}
        </div>

        {puedeSumar ? (
          <button
            type="button"
            onClick={sumar}
            aria-label={`Agregar ${product.nombre} al carrito`}
            className={`pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-crema shadow-md transition duration-300 group-hover:rotate-90 active:scale-95 ${
              agregado ? 'bg-verde' : 'bg-bordo group-hover:bg-verde'
            }`}
          >
            {agregado ? '✓' : '+'}
          </button>
        ) : (
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bordo text-lg leading-none text-crema transition duration-300 group-hover:rotate-90 group-hover:bg-verde"
          >
            +
          </span>
        )}
      </div>
    </div>
  )
}
