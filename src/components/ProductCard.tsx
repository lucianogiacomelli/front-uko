import { Link } from 'react-router'
import { price } from '../data/format'
import { enOferta, precioConOferta } from '../data/ofertas'
import type { Product } from '../types/product'

type Props = { product: Product; showCategory?: boolean }

export default function ProductCard({ product, showCategory = true }: Props) {
  const oferta = enOferta(product)
  const precioFinal = precioConOferta(product.precio, product)

  return (
    <Link
      to={`/producto/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-linea bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(71,14,18,0.12)]"
    >
      {oferta && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-bordo px-3 py-1 text-xs font-extrabold text-crema shadow-md">
          −{product.descuento}% OFF
        </span>
      )}
      <div className="aspect-[4/3] bg-white p-4">
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            loading="lazy"
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-crema-claro">
            <img src="/brand/isotipo-k.png" alt="" className="h-1/2 w-1/2 object-contain opacity-30 mix-blend-multiply" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-1 pb-4">
        {showCategory && <span className="kicker !text-[10px] text-verde">{product.categoria}</span>}
        <h3 className="text-[15px] leading-snug font-extrabold">{product.nombre}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {product.variantes.length > 1 && (
              <p className="text-[11px] font-bold tracking-wide text-bordo/60 uppercase">Desde</p>
            )}
            {oferta && <p className="text-xs font-semibold text-bordo/50 line-through">{price.format(product.precio)}</p>}
            <p className={`text-lg font-extrabold ${oferta ? 'text-verde' : ''}`}>{price.format(precioFinal)}</p>
            {!product.disponible && <span className="text-xs font-medium text-bordo/60">Sin stock</span>}
          </div>
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bordo text-lg leading-none text-crema transition duration-300 group-hover:rotate-90 group-hover:bg-verde"
          >
            +
          </span>
        </div>
      </div>
    </Link>
  )
}
