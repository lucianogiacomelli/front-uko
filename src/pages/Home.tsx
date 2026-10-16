import { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { LeafIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import ProductGrid from '../components/ProductGrid'
import SectionHead from '../components/SectionHead'
import { useCarousel } from '../hooks/useCarousel'
import { enOferta } from '../data/ofertas'
import { slugify } from '../data/products'
import { useProducts } from '../data/useProducts'

const FEATURED_COUNT = 8

// Chevron para las flechas de los carruseles
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function Home() {
  const { products, loading, error } = useProducts()
  const categorias = [...new Set(products.map((p) => p.categoria))].sort()
  const ofertas = useMemo(
    () => products.filter(enOferta).sort((a, b) => b.descuento - a.descuento),
    [products],
  )
  const destacados = products.filter((p) => p.disponible).slice(0, FEATURED_COUNT)
  const catsRef = useRef<HTMLDivElement>(null)
  const ofsRef = useRef<HTMLDivElement>(null)
  const cats = useCarousel(catsRef, categorias.length)
  const ofs = useCarousel(ofsRef, ofertas.length)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-verde-claro">
        <img
          src="/brand/isotipo-k.png"
          alt=""
          className="pointer-events-none absolute -right-16 -bottom-20 w-72 opacity-15 mix-blend-multiply sm:right-10 sm:-bottom-10 sm:w-[26rem]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl leading-[0.98] font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Lo natural,
            <br />
            elegido con
            <br />
            <span className="text-verde">cuidado.</span>
          </h1>
          <p className="mt-6 max-w-md text-base font-medium text-bordo/80 sm:text-lg">
            Recorré nuestra dietética y herboristería: frutos secos, cereales, hierbas y más para tu día a día.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/productos" className="btn-pill">
              Ver productos <span aria-hidden>→</span>
            </Link>
            <Link
              to="/ofertas"
              className="inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-sm font-bold text-crema transition hover:bg-bordo/85"
            >
              Ver ofertas <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías: carrusel horizontal con flechas en desktop */}
      {categorias.length > 0 && (
        <section className="bg-verde py-12 text-crema">
          <div className="mx-auto max-w-6xl px-4">
            <p className="kicker mx-auto mb-8 w-fit border-b-2 border-crema/50 pb-1.5 text-center">
              Explorá por categoría
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => cats.mover(-1)}
                aria-label="Categorías anteriores"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crema text-verde shadow-lg transition hover:scale-105 sm:flex"
              >
                <ChevronIcon className="h-5 w-5 rotate-180" />
              </button>
              <div
                ref={catsRef}
                {...cats.props}
                className="fade-edges grid min-w-0 flex-1 auto-cols-max grid-flow-col grid-rows-2 gap-x-6 gap-y-6 overflow-x-auto px-6 py-3 [scrollbar-width:none] sm:cursor-grab sm:gap-x-8 sm:select-none [&::-webkit-scrollbar]:hidden"
              >
                {categorias.map((c) => (
                  <Link
                    key={c}
                    to={`/categoria/${slugify(c)}`}
                    draggable={false}
                    className="group flex w-24 shrink-0 flex-col items-center gap-3 text-center sm:w-28"
                  >
                    <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-crema/25 bg-crema text-verde shadow-lg transition group-hover:scale-105 sm:h-28 sm:w-28">
                      <LeafIcon className="h-9 w-9" />
                    </span>
                    <span className="kicker leading-tight">{c}</span>
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => cats.mover(1)}
                aria-label="Categorías siguientes"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crema text-verde shadow-lg transition hover:scale-105 sm:flex"
              >
                <ChevronIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Oferta del mes: carrusel en bordo, mismo movimiento que categorías */}
      {!loading && !error && ofertas.length > 0 && (
        <section className="bg-bordo py-14 text-crema">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="kicker text-crema/70">Oferta del mes</span>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Lo mejor para llevar</h2>
              </div>
              <Link to="/ofertas" className="text-sm font-bold hover:underline underline-offset-4">
                Ver todas las ofertas →
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => ofs.mover(-1)}
                aria-label="Ofertas anteriores"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crema text-bordo shadow-lg transition hover:scale-105 sm:flex"
              >
                <ChevronIcon className="h-5 w-5 rotate-180" />
              </button>
              <div
                ref={ofsRef}
                {...ofs.props}
                className="fade-edges flex min-w-0 flex-1 gap-5 overflow-x-auto px-6 py-3 [scrollbar-width:none] sm:cursor-grab sm:gap-6 sm:select-none [&::-webkit-scrollbar]:hidden"
              >
                {ofertas.map((p) => (
                  // text-bordo: las tarjetas son blancas, el texto crema de la sección no debe heredarse
                  <div key={p.id} className="w-60 shrink-0 text-bordo sm:w-64">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => ofs.mover(1)}
                aria-label="Ofertas siguientes"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crema text-bordo shadow-lg transition hover:scale-105 sm:flex"
              >
                <ChevronIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Destacados */}
      <section className="bg-crema-claro">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <SectionHead
            kicker="Selección UKO"
            title="Productos destacados"
            link={{ to: '/productos', label: 'Ver todos' }}
          />
          {loading && <p>Cargando…</p>}
          {error && <p>{error}</p>}
          {!loading && !error && <ProductGrid products={destacados} />}
        </div>
      </section>
    </>
  )
}
