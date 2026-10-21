import { Link } from 'react-router'
import Container from '../components/Container'
import { useCarrito } from '../carrito/CarritoContext'
import { price } from '../data/format'
import { useContacto } from '../data/contacto'
import { armarMensaje, linkWhatsapp, resolverLineas } from '../data/pedido'
import { useProducts } from '../data/useProducts'

const botonCantidad =
  'flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-crema transition hover:bg-crema/15'

export default function Carrito() {
  const { items, cambiarCantidad, quitar, vaciar } = useCarrito()
  const { products, loading, error } = useProducts()
  const contacto = useContacto()

  // Se recalcula en cada render: el mensaje y los totales siempre siguen al carrito
  const lineas = resolverLineas(items, products)
  const cantidad = lineas.reduce((sum, l) => sum + l.cantidad, 0)
  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)
  const mensaje = armarMensaje(lineas)

  return (
    <Container>
      {/* Banner bordo, igual que el de Ofertas */}
      <div className="fade-up mb-6 rounded-2xl border border-bordo/15 bg-bordo p-5 text-crema sm:p-6">
        <span className="kicker text-crema/70">Tu pedido</span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Carrito</h1>
        {!loading && !error && (
          <p className="mt-1 text-sm font-medium text-crema/80">
            {cantidad} {cantidad === 1 ? 'producto' : 'productos'} · Total {price.format(total)}
          </p>
        )}
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p>{error}</p>}

      {!loading && !error && lineas.length === 0 && (
        <div className="fade-up flex flex-col items-start gap-4 rounded-2xl border border-bordo/15 bg-white p-6 shadow-card">
          <p className="font-semibold text-bordo/80">Todavía no agregaste productos.</p>
          <Link
            to="/productos"
            className="inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-sm font-bold text-crema transition hover:bg-bordo/85"
          >
            Ver productos <span aria-hidden>→</span>
          </Link>
        </div>
      )}

      {!loading && !error && lineas.length > 0 && (
        <div className="grid gap-8 md:grid-cols-[1fr_380px]">
          <ul className="flex flex-col gap-4">
            {lineas.map((l) => {
              const clave = `${l.productoId}|${l.etiqueta ?? ''}`
              return (
                <li
                  key={clave}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-bordo/15 border-l-4 border-l-bordo bg-white p-4 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <Link to={`/producto/${l.productoId}`} className="font-extrabold text-bordo hover:text-verde">
                      {l.nombre}
                    </Link>
                    {l.etiqueta && (
                      <span className="mt-1 inline-block rounded-full bg-bordo/10 px-2.5 py-0.5 text-xs font-bold text-bordo">
                        {l.etiqueta}
                      </span>
                    )}
                    <p className="mt-1 text-sm text-bordo/70">{price.format(l.precioUnitario)} c/u</p>
                    {!l.disponible && <p className="text-xs font-bold text-bordo/60">Sin stock</p>}
                  </div>

                  <div className="flex items-center gap-1 rounded-full bg-bordo p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(l.productoId, l.etiqueta, l.cantidad - 1)}
                      aria-label={`Quitar uno de ${l.nombre}`}
                      className={botonCantidad}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-extrabold text-crema" aria-live="polite">
                      {l.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(l.productoId, l.etiqueta, l.cantidad + 1)}
                      aria-label={`Agregar uno de ${l.nombre}`}
                      className={botonCantidad}
                    >
                      +
                    </button>
                  </div>

                  <p className="w-28 text-right text-lg font-black text-bordo">{price.format(l.subtotal)}</p>

                  <button
                    type="button"
                    onClick={() => quitar(l.productoId, l.etiqueta)}
                    className="text-sm font-bold text-bordo/60 underline underline-offset-4 hover:text-bordo"
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>

          <aside className="flex flex-col gap-4 rounded-2xl border border-linea bg-white p-5 shadow-card md:sticky md:top-44 md:self-start">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-bordo/70">
                {cantidad} {cantidad === 1 ? 'producto' : 'productos'}
              </span>
              <p className="text-3xl font-extrabold">{price.format(total)}</p>
            </div>

            <div>
              <p className="kicker text-bordo/60">Mensaje que se enviará</p>
              <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-crema-claro p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap text-bordo">
                {mensaje}
              </pre>
            </div>

            <a
              href={linkWhatsapp(mensaje, contacto.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill w-full justify-center"
            >
              Enviar pedido por WhatsApp
            </a>
            <button
              type="button"
              onClick={vaciar}
              className="text-sm font-bold text-bordo/60 underline underline-offset-4 hover:text-bordo"
            >
              Vaciar carrito
            </button>
          </aside>
        </div>
      )}
    </Container>
  )
}
