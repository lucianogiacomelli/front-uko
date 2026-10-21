import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import CategorySection from '../components/CategorySection'
import Container from '../components/Container'
import FiltrosDrawer from '../components/FiltrosDrawer'
import { enRango, type Rango } from '../data/filters'
import { slugify } from '../data/products'
import { useProducts } from '../data/useProducts'

const normalize = (s: string) => slugify(s).replace(/-/g, ' ')

export default function Productos() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const { products, loading, error } = useProducts()
  const [activeId, setActiveId] = useState<string | null>(null)
  // El panel de filtros vive en la URL (?filtros=1): así el header puede abrirlo desde cualquier lado
  const drawerOpen = params.get('filtros') === '1'
  const [etiquetasSel, setEtiquetasSel] = useState<string[]>([])
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [rango, setRango] = useState<Rango>('todos')
  const resultadosRef = useRef<HTMLDivElement>(null)
  // Aviso "desliza para ver los productos"
  const [hint, setHint] = useState(false)

  // Etiquetas disponibles en el catálogo, para los filtros
  const etiquetas = [...new Set(products.flatMap((p) => p.etiquetas))].sort()
  const filtrosActivos = etiquetasSel.length + (soloDisponibles ? 1 : 0) + (rango !== 'todos' ? 1 : 0)

  const needle = normalize(q)
  const items = products.filter((p) => {
    if (needle && !normalize(`${p.nombre} ${p.categoria} ${p.etiquetas.join(' ')}`).includes(needle)) return false
    if (etiquetasSel.some((t) => !p.etiquetas.includes(t))) return false
    if (soloDisponibles && !p.disponible) return false
    return enRango(p.precio, rango)
  })

  // Una sección por categoría, en orden alfabético, con sus productos
  const categorias = [...new Set(items.map((p) => p.categoria))].sort()
  const groups = categorias.map((c) => ({
    id: `cat-${slugify(c)}`,
    title: c,
    products: items.filter((p) => p.categoria === c),
  }))
  const groupsKey = groups.map((g) => g.id).join('|')

  // El aviso solo aparece si quedan productos por debajo de la pantalla, y se oculta al empezar a bajar.
  // Se recalcula cuando cambian los resultados (búsqueda o filtros) o el tamaño de la ventana.
  useEffect(() => {
    const actualizar = () => {
      const fin = resultadosRef.current?.getBoundingClientRect().bottom ?? 0
      setHint(window.scrollY < 120 && fin > window.innerHeight + 40)
    }
    // Espera a que se pinten los resultados para medirlos
    const frame = requestAnimationFrame(actualizar)
    window.addEventListener('scroll', actualizar, { passive: true })
    window.addEventListener('resize', actualizar)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', actualizar)
      window.removeEventListener('resize', actualizar)
    }
  }, [groupsKey, items.length, loading])

  // Marca la categoría que está en el centro de la pantalla
  useEffect(() => {
    const secciones = document.querySelectorAll<HTMLElement>('[data-cat-section]')
    if (secciones.length === 0 || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    secciones.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [groupsKey])

  const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function abrirDrawer() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('filtros', '1')
      return next
    })
  }

  // Cierra el panel quitando el parámetro de la URL
  const cerrarDrawer = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('filtros')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  // Cierra el panel y baja a la sección elegida (o al inicio de los resultados)
  function irA(id: string) {
    cerrarDrawer()
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reducir() ? 'auto' : 'smooth', block: 'start' })
    })
  }

  function verResultados() {
    cerrarDrawer()
    requestAnimationFrame(() => {
      resultadosRef.current?.scrollIntoView({ behavior: reducir() ? 'auto' : 'smooth', block: 'start' })
    })
  }

  function toggleEtiqueta(t: string) {
    setEtiquetasSel((sel) => (sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t]))
  }

  function limpiarFiltros() {
    setEtiquetasSel([])
    setSoloDisponibles(false)
    setRango('todos')
  }

  return (
    <Container>
      <div className="fade-up mb-6 rounded-2xl border border-verde/20 bg-verde-claro p-5 sm:p-6">
        <span className="kicker text-verde">Catálogo</span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {q ? `Resultados para “${q}”` : 'Todos los productos'}
        </h1>
        {!loading && !error && (
          <p className="mt-1 text-sm font-medium text-bordo/70">
            {items.length} productos en {groups.length} categorías
          </p>
        )}
        {!loading && !error && (
          <button
            type="button"
            onClick={abrirDrawer}
            aria-haspopup="dialog"
            className="btn-pill mt-4"
          >
            Filtros y categorías
            {filtrosActivos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crema px-1.5 text-xs font-extrabold text-verde">
                {filtrosActivos}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Siempre montado: aparece y se va con un fundido en vez de cortarse de golpe */}
      {!loading && !error && groups.length > 0 && (
        <div
          aria-hidden={!hint}
          className={`pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center transition duration-500 ease-out motion-reduce:transition-none ${
            hint ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <span className="flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-sm font-bold text-crema shadow-lg">
            Desliza para ver los productos
            <span className="scroll-hint-arrow inline-block" aria-hidden>
              ↓
            </span>
          </span>
        </div>
      )}

      <FiltrosDrawer
        open={drawerOpen}
        onClose={cerrarDrawer}
        groups={groups.map((g) => ({ id: g.id, title: g.title, count: g.products.length }))}
        activeId={activeId}
        onSelect={irA}
        etiquetas={etiquetas}
        etiquetasSel={etiquetasSel}
        onToggleEtiqueta={toggleEtiqueta}
        soloDisponibles={soloDisponibles}
        onSoloDisponibles={setSoloDisponibles}
        rango={rango}
        onRango={setRango}
        total={items.length}
        onVerResultados={verResultados}
        hayFiltros={filtrosActivos > 0}
        onLimpiar={limpiarFiltros}
      />

      <div ref={resultadosRef} className="scroll-mt-44">
        {loading && <p>Cargando…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && groups.length === 0 && (
          <div className="rounded-2xl border border-linea bg-white p-6 text-bordo/70">
            <p>No hay productos con estos filtros.</p>
            {filtrosActivos > 0 && (
              <button type="button" onClick={limpiarFiltros} className="mt-3 text-sm font-bold text-verde hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
        {!loading &&
          !error &&
          groups.map((g) => <CategorySection key={g.id} id={g.id} title={g.title} products={g.products} />)}
      </div>
    </Container>
  )
}
