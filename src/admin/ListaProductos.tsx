import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { price } from '../data/format'
import { slugify } from '../data/products'
import type { Categoria } from '../types/product'
import { eliminarDefinitivo, listarCategorias, listarProductos, marcarEliminado, type ProductoAdmin } from './api'
import { Aviso, Cargando, Spinner } from './ui'

const POR_PAGINA = 25

const normalize = (s: string) => slugify(s).replace(/-/g, ' ')

export default function ListaProductos() {
  const [productos, setProductos] = useState<ProductoAdmin[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [error, setError] = useState<string | null>(null)
  // Búsqueda, categoría, pestaña y página viven en la URL: al volver de editar se mantienen
  const [params, setParams] = useSearchParams()
  const busqueda = params.get('q') ?? ''
  const categoria = params.get('cat') ?? ''
  const eliminadosVista = params.get('vista') === 'eliminados'
  const pagina = Math.max(1, Number(params.get('pag')) || 1)
  // Producto con el borrado definitivo pidiendo confirmación
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listarProductos(), listarCategorias()])
      .then(([ps, cs]) => {
        setProductos(ps)
        setCategorias(cs)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  // Cambiar un filtro vuelve a la página 1
  function filtrar(cambios: Record<string, string>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(cambios)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        if (!('pag' in cambios)) next.delete('pag')
        return next
      },
      { replace: true },
    )
  }

  async function accion(id: string, fn: () => Promise<void>) {
    setOcupado(id)
    setError(null)
    try {
      await fn()
      setProductos(await listarProductos())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOcupado(null)
      setConfirmar(null)
    }
  }

  if (!productos) return error ? <Aviso mensaje={error} /> : <Cargando filas={8} />

  const needle = normalize(busqueda)
  const eliminados = productos.filter((p) => p.eliminadoEn).length
  const filtrados = productos.filter(
    (p) =>
      eliminadosVista === Boolean(p.eliminadoEn) &&
      (!categoria || p.categoriaId === categoria) &&
      (!needle || normalize(`${p.nombre} ${p.id}`).includes(needle)),
  )
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas)
  const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA)
  const volver = { volver: params.size ? `?${params}` : '' }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Productos</h1>
        <Link to="/admin/producto/nuevo" state={volver} className="btn-pill">
          + Nuevo producto
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre"
          value={busqueda}
          onChange={(e) => filtrar({ q: e.target.value })}
          className="campo w-full sm:max-w-xs"
          aria-label="Buscar productos"
        />
        <select
          value={categoria}
          onChange={(e) => filtrar({ cat: e.target.value })}
          className="campo w-full sm:w-64"
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="flex rounded-full border border-linea bg-white p-1 text-sm font-bold" role="tablist">
          {[
            ['', `Activos (${productos.length - eliminados})`],
            ['eliminados', `Eliminados (${eliminados})`],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={eliminadosVista === Boolean(v)}
              onClick={() => filtrar({ vista: v })}
              className={`rounded-full px-4 py-1.5 ${eliminadosVista === Boolean(v) ? 'bg-verde text-crema' : 'text-bordo/70'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Aviso mensaje={error} />

      <ul className="mt-4 divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white shadow-card">
        {visibles.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-crema-claro">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-linea bg-crema-claro">
              {p.imagen && <img src={p.imagen} alt="" loading="lazy" className="h-full w-full object-contain" />}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/admin/producto/${p.id}`} state={volver} className="font-bold hover:text-verde hover:underline">
                {p.nombre}
              </Link>
              <p className="text-xs text-bordo/60">
                {p.categoria}
                {p.variantes.length > 1 && ` · ${p.variantes.length} presentaciones`}
                {!p.disponible && ' · Sin stock'}
                {p.enOferta && p.descuento > 0 && ` · −${p.descuento}%`}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums">{price.format(p.precio)}</span>
            <div className="flex w-full justify-end gap-3 text-sm font-semibold whitespace-nowrap sm:w-auto">
              {ocupado === p.id ? (
                <span className="inline-flex items-center gap-2 text-bordo/60">
                  <Spinner />
                  Procesando…
                </span>
              ) : !eliminadosVista ? (
                <>
                  <Link to={`/admin/producto/${p.id}`} state={volver} className="text-verde hover:underline">
                    Editar
                  </Link>
                  <button type="button" onClick={() => accion(p.id, () => marcarEliminado(p.id, true))} className="text-bordo/70 hover:text-bordo">
                    Eliminar
                  </button>
                </>
              ) : confirmar === p.id ? (
                <>
                  <span className="text-red-700">¿Borrar para siempre?</span>
                  <button type="button" onClick={() => accion(p.id, () => eliminarDefinitivo(p))} className="text-red-700 underline">
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmar(null)} className="text-bordo/70">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => accion(p.id, () => marcarEliminado(p.id, false))} className="text-verde hover:underline">
                    Restaurar
                  </button>
                  <button type="button" onClick={() => setConfirmar(p.id)} className="text-red-700 hover:underline">
                    Borrar definitivo
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {visibles.length === 0 && <li className="px-4 py-6 text-center text-bordo/60">No hay productos.</li>}
      </ul>

      <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginación">
        <span className="text-bordo/70">
          {filtrados.length === 0
            ? '0 productos'
            : `Mostrando ${(actual - 1) * POR_PAGINA + 1}–${(actual - 1) * POR_PAGINA + visibles.length} de ${filtrados.length}`}
        </span>
        {paginas > 1 && (
          <div className="flex items-center gap-2 font-bold">
            <button
              type="button"
              disabled={actual === 1}
              onClick={() => filtrar({ pag: String(actual - 1) })}
              className="rounded-full border border-linea bg-white px-4 py-1.5 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="px-2">
              {actual} / {paginas}
            </span>
            <button
              type="button"
              disabled={actual === paginas}
              onClick={() => filtrar({ pag: String(actual + 1) })}
              className="rounded-full border border-linea bg-white px-4 py-1.5 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </nav>
    </section>
  )
}
