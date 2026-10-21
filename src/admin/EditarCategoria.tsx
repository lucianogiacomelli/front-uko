import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { slugify } from '../data/products'
import type { Categoria } from '../types/product'
import { guardarCategoria, guardarConImagen, listarCategorias } from './api'
import ImagenInput, { type ArchivoImagen } from './ImagenInput'
import { Aviso, Campo } from './ui'

export default function EditarCategoria() {
  const { id: idRuta } = useParams()
  const nueva = idRuta === undefined
  const navigate = useNavigate()
  const [form, setForm] = useState<Categoria | null>(nueva ? { id: '', nombre: '', imagen: '' } : null)
  const [imagenOriginal, setImagenOriginal] = useState('')
  const [archivo, setArchivo] = useState<ArchivoImagen | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (nueva) return
    listarCategorias()
      .then((cs) => {
        const c = cs.find((x) => x.id === idRuta)
        if (!c) return setError('La categoría no existe.')
        setForm({ id: c.id, nombre: c.nombre, imagen: c.imagen })
        setImagenOriginal(c.imagen)
      })
      .catch((e: Error) => setError(e.message))
  }, [idRuta, nueva])

  if (!form) return error ? <Aviso mensaje={error} /> : <p>Cargando…</p>

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const nombre = form!.nombre.trim()
    // El id sale del nombre al crear y después no cambia (es la URL de la categoría)
    const id = nueva ? slugify(nombre) : form!.id
    if (!nombre || !id) return setError('Falta el nombre.')
    setGuardando(true)
    setError(null)
    try {
      await guardarConImagen(`categorias/${id}`, archivo?.file ?? null, form!.imagen, imagenOriginal, (imagen) =>
        guardarCategoria({ id, nombre, imagen }, nueva),
      )
      navigate('/admin/categorias')
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="mx-auto max-w-xl">
      <Link to="/admin/categorias" className="text-sm font-semibold text-verde hover:underline">
        ← Categorías
      </Link>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">{nueva ? 'Nueva categoría' : form.nombre || 'Editar categoría'}</h1>

      <div className="grid gap-5 rounded-2xl border border-linea bg-white p-5 sm:p-6">
        <Campo label="Nombre" ayuda={nueva ? undefined : `Dirección: /categoria/${form.id} (no cambia al renombrar)`}>
          <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="campo" />
        </Campo>
        <ImagenInput
          imagen={form.imagen}
          archivo={archivo}
          onArchivo={(a) => {
            setError(null)
            setArchivo(a)
          }}
          onQuitar={() => setForm({ ...form, imagen: '' })}
          onError={setError}
          redonda
        />
      </div>

      <Aviso mensaje={error} />

      <div className="mt-5 flex justify-end gap-3">
        <Link to="/admin/categorias" className="rounded-full px-6 py-3 text-sm font-bold text-bordo/70 hover:text-bordo">
          Cancelar
        </Link>
        <button type="submit" disabled={guardando} className="btn-pill disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
