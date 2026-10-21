import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { price } from '../data/format'
import { slugify } from '../data/products'
import { eliminarDefinitivo, listarProductos, marcarEliminado, type ProductoAdmin } from './api'

type Vista = 'activos' | 'eliminados'

const normalize = (s: string) => slugify(s).replace(/-/g, ' ')

export default function ListaProductos() {
  const [productos, setProductos] = useState<ProductoAdmin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('activos')
  // Producto con el borrado definitivo pidiendo confirmación
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    listarProductos()
      .then(setProductos)
      .catch((e: Error) => setError(e.message))
  }, [])

  async function accion(id: string, fn: () => Promise<void>, quitar: boolean) {
    setOcupado(id)
    setError(null)
    try {
      await fn()
      setProductos(quitar ? (ps) => ps?.filter((p) => p.id !== id) ?? null : await listarProductos())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOcupado(null)
      setConfirmar(null)
    }
  }

  if (!productos) return <p>{error ?? 'Cargando…'}</p>

  const needle = normalize(busqueda)
  const eliminados = productos.filter((p) => p.eliminadoEn).length
  const visibles = productos.filter(
    (p) =>
      (vista === 'eliminados') === Boolean(p.eliminadoEn) &&
      (!needle || normalize(`${p.nombre} ${p.categoria} ${p.id}`).includes(needle)),
  )

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Productos</h1>
        <Link to="/admin/producto/nuevo" className="btn-pill">
          + Nuevo producto
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre, categoría o id"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="campo max-w-sm"
          aria-label="Buscar productos"
        />
        <div className="flex rounded-full border border-linea bg-white p-1 text-sm font-bold" role="tablist">
          {(['activos', 'eliminados'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={`rounded-full px-4 py-1.5 ${vista === v ? 'bg-verde text-crema' : 'text-bordo/70'}`}
            >
              {v === 'activos' ? `Activos (${productos.length - eliminados})` : `Eliminados (${eliminados})`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-linea bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea text-xs tracking-wide text-bordo/60 uppercase">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Desde</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className="border-b border-linea last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/admin/producto/${p.id}`} className="font-bold hover:text-verde hover:underline">
                    {p.nombre}
                  </Link>
                  {p.variantes.length > 1 && (
                    <span className="ml-2 text-xs text-bordo/60">{p.variantes.length} presentaciones</span>
                  )}
                </td>
                <td className="px-4 py-3 text-bordo/80">{p.categoria}</td>
                <td className="px-4 py-3 text-right tabular-nums">{price.format(p.precio)}</td>
                <td className="px-4 py-3">
                  {!p.disponible && <Chip>Sin stock</Chip>}
                  {p.enOferta && p.descuento > 0 && <Chip>−{p.descuento}%</Chip>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 font-semibold whitespace-nowrap">
                    {ocupado === p.id ? (
                      <span className="text-bordo/60">Procesando…</span>
                    ) : vista === 'activos' ? (
                      <>
                        <Link to={`/admin/producto/${p.id}`} className="text-verde hover:underline">
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => accion(p.id, () => marcarEliminado(p.id, true), false)}
                          className="text-bordo/70 hover:text-bordo"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : confirmar === p.id ? (
                      <>
                        <span className="text-red-700">¿Borrar para siempre?</span>
                        <button
                          type="button"
                          onClick={() => accion(p.id, () => eliminarDefinitivo(p), true)}
                          className="text-red-700 underline"
                        >
                          Sí, borrar
                        </button>
                        <button type="button" onClick={() => setConfirmar(null)} className="text-bordo/70">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => accion(p.id, () => marcarEliminado(p.id, false), false)}
                          className="text-verde hover:underline"
                        >
                          Restaurar
                        </button>
                        <button type="button" onClick={() => setConfirmar(p.id)} className="text-red-700 hover:underline">
                          Borrar definitivo
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-bordo/60">
                  No hay productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="mr-1 rounded-full bg-verde-claro px-2 py-0.5 text-xs font-bold">{children}</span>
}
