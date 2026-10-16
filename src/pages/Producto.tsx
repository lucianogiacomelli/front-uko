import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Container from '../components/Container'
import { price } from '../data/format'
import { enOferta, precioConOferta } from '../data/ofertas'
import { slugify } from '../data/products'
import { useProducts } from '../data/useProducts'

export default function Producto() {
  const { id } = useParams()
  const { products, loading, error } = useProducts()
  const product = products.find((p) => p.id === id)
  // Índice de la presentación elegida; si cambia de producto, vuelve a la primera
  const [sel, setSel] = useState(0)
  const variante = product?.variantes[sel] ?? product?.variantes[0]

  return (
    <Container>
      {loading && <p>Cargando…</p>}
      {error && <p>{error}</p>}
      {!loading && !error && !product && <p>Producto no encontrado.</p>}
      {product && (
        <article className="flex flex-col gap-6">
          <Link
            to={`/categoria/${slugify(product.categoria)}`}
            className="text-sm font-bold text-verde hover:underline"
          >
            ← {product.categoria}
          </Link>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-[19px] border border-linea bg-white p-6 shadow-card">
              {product.imagen ? (
                <img src={product.imagen} alt={product.nombre} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-crema-claro">
                  <img src="/brand/isotipo-k.png" alt="" className="h-1/2 w-1/2 object-contain opacity-30 mix-blend-multiply" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <span className="kicker text-verde">{product.categoria}</span>
              <h1 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">{product.nombre}</h1>
              {product.variantes.length > 1 && (
                <div className="flex flex-col gap-2">
                  <span className="kicker text-bordo/70">Presentación</span>
                  <div className="flex flex-wrap gap-2">
                    {product.variantes.map((v, i) => (
                      <button
                        key={v.etiqueta}
                        type="button"
                        onClick={() => setSel(i)}
                        aria-pressed={i === sel}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition duration-300 ${
                          i === sel
                            ? 'border-verde bg-verde text-crema'
                            : 'border-linea bg-white text-bordo hover:border-verde hover:text-verde'
                        }`}
                      >
                        {v.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {enOferta(product) ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-bordo px-3 py-1 text-sm font-extrabold text-crema">
                    −{product.descuento}% OFF
                  </span>
                  <p className="text-lg font-semibold text-bordo/50 line-through">
                    {price.format(variante?.precio ?? product.precio)}
                  </p>
                  <p className="text-3xl font-extrabold text-verde">
                    {price.format(precioConOferta(variante?.precio ?? product.precio, product))}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-extrabold">{price.format(variante?.precio ?? product.precio)}</p>
              )}
              {!product.disponible && (
                <p className="w-fit rounded-full bg-bordo/10 px-3 py-1 text-xs font-bold">Sin stock</p>
              )}
              {product.etiquetas.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {product.etiquetas.map((t) => (
                    <li key={t} className="rounded-full bg-verde-claro px-3 py-1 text-xs font-bold text-verde-oscuro">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <p className="leading-relaxed text-bordo/80">{product.descripcion}</p>
            </div>
          </div>
        </article>
      )}
    </Container>
  )
}
