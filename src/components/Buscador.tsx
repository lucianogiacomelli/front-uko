import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { buscarProductos } from '../data/busqueda'
import { price } from '../data/format'
import { enOferta, precioConOferta } from '../data/ofertas'
import { useProducts } from '../data/useProducts'
import type { Product } from '../types/product'
import { SearchIcon } from './Icons'

const MAX_SUGERENCIAS = 6

// Barra de búsqueda de la cabecera. Mientras se escribe:
// - en cualquier página muestra debajo los productos que coinciden;
// - en Productos filtra la grilla en vivo (ahí no hacen falta las sugerencias).
// Las sugerencias se ubican respecto del contenedor posicionado más cercano (la fila de la cabecera).
export default function Buscador() {
  const [params, setParams] = useSearchParams()
  const qUrl = params.get('q') ?? ''
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const enProductos = pathname === '/productos'
  const { products } = useProducts()

  const [texto, setTexto] = useState(qUrl)
  const inputRef = useRef<HTMLInputElement>(null)
  const [qAnterior, setQAnterior] = useState(qUrl)
  const [rutaAnterior, setRutaAnterior] = useState(pathname)
  const [abierto, setAbierto] = useState(false)
  // Sugerencia marcada con las flechas del teclado (-1 = ninguna)
  const [activo, setActivo] = useState(-1)

  // Si la búsqueda de la URL cambia desde afuera (volver atrás, otro link), el campo la acompaña
  if (qUrl !== qAnterior) {
    setQAnterior(qUrl)
    if (qUrl !== texto.trim()) setTexto(qUrl)
  }
  // Al cambiar de página se cierran las sugerencias
  if (pathname !== rutaAnterior) {
    setRutaAnterior(pathname)
    setAbierto(false)
  }

  // En Productos la grilla sigue a lo que se escribe, con una pausa corta para no recalcular en cada tecla
  useEffect(() => {
    const q = texto.trim()
    if (!enProductos || q === qUrl) return
    const t = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (q) next.set('q', q)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 200)
    return () => window.clearTimeout(t)
  }, [texto, enProductos, qUrl, setParams])

  const resultados = useMemo(() => buscarProductos(products, texto), [products, texto])
  const visibles = resultados.slice(0, MAX_SUGERENCIAS)
  const mostrar = abierto && !enProductos && texto.trim() !== ''
  const enOfertaTotal = resultados.filter(enOferta).length

  // Cierra la lista y saca el foco del campo: en el celular eso baja el teclado.
  // Las sugerencias y "Ver resultados" mantienen el foco al tocarlos, así que hay que soltarlo acá
  function cerrar() {
    setAbierto(false)
    inputRef.current?.blur()
  }

  function irAProducto(p: Product) {
    cerrar()
    navigate(`/producto/${p.id}`)
  }

  function verTodos() {
    cerrar()
    const q = texto.trim()
    navigate(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos')
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mostrar && visibles[activo]) irAProducto(visibles[activo])
    else verTodos()
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') return setAbierto(false)
    if (!mostrar || visibles.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      // Recorre -1 (el campo), 0 … n-1 y vuelve a empezar
      const paso = e.key === 'ArrowDown' ? 1 : -1
      const total = visibles.length + 1
      setActivo((a) => ((((a + 1 + paso) % total) + total) % total) - 1)
    }
  }

  return (
    <form onSubmit={enviar} role="search" className="min-w-0 flex-1">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-bordo/50" />
        <input
          ref={inputRef}
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
            setActivo(-1)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={teclas}
          placeholder="Buscar productos"
          aria-label="Buscar productos"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls="sugerencias-busqueda"
          aria-activedescendant={mostrar && visibles[activo] ? `sugerencia-${visibles[activo].id}` : undefined}
          autoComplete="off"
          className="h-11 w-full rounded-full border border-white/95 bg-white/90 pr-4 pl-11 text-sm text-bordo shadow-[0_7px_22px_rgba(71,14,18,0.09)] outline-none backdrop-blur placeholder:text-bordo/40 focus:border-verde sm:h-12 sm:text-[15px]"
        />
      </div>

      {mostrar && (
        <div className="fade-in absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-linea bg-white text-bordo shadow-[0_18px_40px_rgba(71,14,18,0.18)]">
          {visibles.length === 0 ? (
            <p className="px-4 py-4 text-sm text-bordo/70">Sin resultados para “{texto.trim()}”.</p>
          ) : (
            <ul id="sugerencias-busqueda" role="listbox" aria-label="Productos que coinciden" className="max-h-[60vh] overflow-y-auto pt-2 pb-1">
              {visibles.map((p, i) => {
                const oferta = enOferta(p)
                return (
                  <li
                    key={p.id}
                    id={`sugerencia-${p.id}`}
                    role="option"
                    aria-selected={i === activo}
                    // Evita que el campo pierda el foco (y se cierre la lista) antes del clic
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => irAProducto(p)}
                    onMouseEnter={() => setActivo(i)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${i === activo ? 'bg-verde-claro' : ''}`}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-linea bg-crema-claro">
                      {oferta && (
                        <span className="absolute -top-1 -left-1.5 z-10 rounded-full bg-bordo px-1.5 py-0.5 text-[10px] leading-none font-extrabold text-crema shadow">
                          −{p.descuento}%
                        </span>
                      )}
                      <img
                        src={p.imagen || '/brand/isotipo-k.png'}
                        alt=""
                        loading="lazy"
                        className={p.imagen ? 'max-h-full max-w-full rounded-md object-contain' : 'h-1/2 w-1/2 object-contain opacity-30 mix-blend-multiply'}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{p.nombre}</span>
                      <span className="block truncate text-xs text-bordo/60">{p.categoria}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-bold tabular-nums">
                      {p.variantes.length > 1 && <span className="block text-[10px] font-semibold text-bordo/50 uppercase">desde</span>}
                      {oferta && <span className="block text-[11px] font-semibold text-bordo/50 line-through">{price.format(p.precio)}</span>}
                      <span className={oferta ? 'text-verde' : ''}>{price.format(precioConOferta(p.precio, p))}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={verTodos}
            className="block w-full border-t border-linea px-4 py-3 text-left text-sm font-bold text-verde transition-colors hover:bg-crema-claro"
          >
            {resultados.length > 0
              ? `Ver ${resultados.length === 1 ? 'el resultado' : `los ${resultados.length} resultados`} →`
              : 'Ver todos los productos →'}
            {enOfertaTotal > 0 && (
              <span className="ml-2 rounded-full bg-bordo px-2 py-0.5 text-[11px] font-extrabold text-crema">
                {enOfertaTotal} en oferta
              </span>
            )}
          </button>
        </div>
      )}
    </form>
  )
}
