import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { eliminarCategoria, listarCategorias, type CategoriaAdmin } from './api'
import { Aviso, Cargando, Spinner } from './ui'

export default function ListaCategorias() {
  const [categorias, setCategorias] = useState<CategoriaAdmin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch((e: Error) => setError(e.message))
  }, [])

  async function eliminar(c: CategoriaAdmin) {
    setOcupado(c.id)
    setError(null)
    try {
      await eliminarCategoria(c)
      setCategorias((cs) => cs?.filter((x) => x.id !== c.id) ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOcupado(null)
      setConfirmar(null)
    }
  }

  if (!categorias) return error ? <Aviso mensaje={error} /> : <Cargando filas={8} />

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Categorías</h1>
        <Link to="/admin/categorias/nueva" className="btn-pill">
          + Nueva categoría
        </Link>
      </div>

      <Aviso mensaje={error} />

      <ul className="mt-4 divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white shadow-card">
        {categorias.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-crema-claro">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-linea bg-crema-claro">
              {c.imagen && <img src={c.imagen} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/admin/categorias/${c.id}`} className="font-bold hover:text-verde hover:underline">
                {c.nombre}
              </Link>
              <p className="text-xs text-bordo/60">
                <Link to={`/admin?cat=${c.id}`} className="hover:underline">
                  {c.productos} {c.productos === 1 ? 'producto' : 'productos'}
                </Link>
              </p>
            </div>
            <div className="flex w-full justify-end gap-3 text-sm font-semibold whitespace-nowrap sm:w-auto">
              {ocupado === c.id ? (
                <span className="inline-flex items-center gap-2 text-bordo/60">
                  <Spinner />
                  Procesando…
                </span>
              ) : confirmar === c.id ? (
                <>
                  <span className="text-red-700">¿Borrar la categoría?</span>
                  <button type="button" onClick={() => eliminar(c)} className="text-red-700 underline">
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmar(null)} className="text-bordo/70">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <Link to={`/admin/categorias/${c.id}`} className="text-verde hover:underline">
                    Editar
                  </Link>
                  <button
                    type="button"
                    disabled={c.productos > 0}
                    title={c.productos > 0 ? 'Tiene productos: movelos a otra categoría o borralos primero' : undefined}
                    onClick={() => setConfirmar(c.id)}
                    className="text-bordo/70 hover:text-bordo disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {categorias.length === 0 && <li className="px-4 py-6 text-center text-bordo/60">No hay categorías.</li>}
      </ul>
    </section>
  )
}
