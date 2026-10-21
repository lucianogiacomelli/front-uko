import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { slugify } from '../data/products'
import type { Product, Variante } from '../types/product'
import { borrarImagen, guardarProducto, listarProductos, obtenerProducto, subirImagen } from './api'

// Variantes en edición: el precio queda como texto hasta guardar
type VarianteForm = { etiqueta: string; precio: string; disponible: boolean }

type Form = {
  id: string
  nombre: string
  categoria: string
  descripcion: string
  etiquetas: string
  disponible: boolean
  enOferta: boolean
  descuento: string
  imagen: string
  variantes: VarianteForm[]
}

const VACIO: Form = {
  id: '',
  nombre: '',
  categoria: '',
  descripcion: '',
  etiquetas: '',
  disponible: true,
  enOferta: false,
  descuento: '0',
  imagen: '',
  variantes: [{ etiqueta: 'Único', precio: '', disponible: true }],
}

const MAX_IMAGEN = 5 * 1024 * 1024

function aForm(p: Product): Form {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    etiquetas: p.etiquetas.join(', '),
    disponible: p.disponible,
    enOferta: p.enOferta,
    descuento: String(p.descuento),
    imagen: p.imagen,
    variantes: p.variantes.map((v) => ({ etiqueta: v.etiqueta, precio: String(v.precio), disponible: v.disponible })),
  }
}

// Valida y arma el producto. Devuelve el primer error encontrado.
function aProducto(f: Form): Product | string {
  const id = f.id.trim()
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return 'El id solo puede tener minúsculas, números y guiones.'
  if (!f.nombre.trim()) return 'Falta el nombre.'
  if (!f.categoria.trim()) return 'Falta la categoría.'
  const descuento = Number(f.descuento)
  if (!Number.isInteger(descuento) || descuento < 0 || descuento > 100) return 'El descuento va de 0 a 100.'
  if (f.variantes.length === 0) return 'Agregá al menos una presentación.'
  const variantes: Variante[] = []
  for (const v of f.variantes) {
    const precio = Number(v.precio.replace(',', '.'))
    if (!v.etiqueta.trim()) return 'Cada presentación necesita un nombre.'
    if (v.precio.trim() === '' || !Number.isFinite(precio) || precio < 0) return `Precio inválido en "${v.etiqueta}".`
    if (variantes.some((x) => x.etiqueta === v.etiqueta.trim())) return `La presentación "${v.etiqueta}" está repetida.`
    variantes.push({ etiqueta: v.etiqueta.trim(), precio, disponible: v.disponible })
  }
  return {
    id,
    nombre: f.nombre.trim(),
    categoria: f.categoria.trim(),
    descripcion: f.descripcion.trim(),
    imagen: f.imagen,
    etiquetas: [...new Set(f.etiquetas.split(',').map((t) => t.trim()).filter(Boolean))],
    disponible: f.disponible,
    enOferta: f.enOferta,
    descuento,
    precio: Math.min(...variantes.map((v) => v.precio)),
    variantes,
  }
}

export default function EditarProducto() {
  const { id: idRuta } = useParams()
  const nuevo = idRuta === undefined
  const navigate = useNavigate()
  const [form, setForm] = useState<Form | null>(nuevo ? VACIO : null)
  const [idEditado, setIdEditado] = useState(false)
  // Imagen guardada en la base: se borra del storage si se reemplaza o se quita
  const [imagenOriginal, setImagenOriginal] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  // Imagen elegida y no subida todavía, con su URL temporal para la vista previa
  const [archivo, setArchivo] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    listarProductos()
      .then((ps) => setCategorias([...new Set(ps.map((p) => p.categoria))].sort()))
      .catch(() => {})
    if (nuevo) return
    obtenerProducto(idRuta)
      .then((p) => {
        if (!p) return setError('El producto no existe.')
        setForm(aForm(p))
        setImagenOriginal(p.imagen)
      })
      .catch((e: Error) => setError(e.message))
  }, [idRuta, nuevo])

  // Libera la URL temporal de la vista previa al cambiarla o salir
  useEffect(() => {
    if (!archivo) return
    return () => URL.revokeObjectURL(archivo.url)
  }, [archivo])

  if (!form) return <p>{error ?? 'Cargando…'}</p>

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v })
  const setVariante = (i: number, v: Partial<VarianteForm>) =>
    set('variantes', form.variantes.map((x, j) => (j === i ? { ...x, ...v } : x)))

  function cambiarNombre(nombre: string) {
    // Al crear, el id sigue al nombre hasta que se edita a mano
    setForm({ ...form!, nombre, id: nuevo && !idEditado ? slugify(nombre) : form!.id })
  }

  function elegirArchivo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('El archivo tiene que ser una imagen.')
    if (file.size > MAX_IMAGEN) return setError('La imagen pesa más de 5 MB.')
    setError(null)
    setArchivo({ file, url: URL.createObjectURL(file) })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const producto = aProducto(form!)
    if (typeof producto === 'string') return setError(producto)
    setGuardando(true)
    setError(null)
    let subida: string | null = null
    try {
      if (archivo) {
        subida = await subirImagen(producto.id, archivo.file)
        producto.imagen = subida
      }
      await guardarProducto(producto, nuevo)
      if (imagenOriginal && imagenOriginal !== producto.imagen) await borrarImagen(imagenOriginal)
      navigate('/admin')
    } catch (err) {
      // Si falló el guardado, no dejar la imagen nueva huérfana
      if (subida) await borrarImagen(subida)
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  const imagenVista = archivo?.url ?? form.imagen

  return (
    <form onSubmit={guardar} className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm font-semibold text-verde hover:underline">
            ← Productos
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{nuevo ? 'Nuevo producto' : form.nombre || 'Editar producto'}</h1>
        </div>
        {!nuevo && (
          <Link to={`/producto/${form.id}`} className="text-sm font-semibold text-verde hover:underline">
            Ver en la tienda
          </Link>
        )}
      </div>

      <div className="grid gap-5 rounded-2xl border border-linea bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre">
            <input required value={form.nombre} onChange={(e) => cambiarNombre(e.target.value)} className="campo" />
          </Campo>
          <Campo label="Id (URL)" ayuda={nuevo ? 'Se usa en la dirección del producto. No se puede cambiar después.' : 'No se puede cambiar.'}>
            <input
              required
              value={form.id}
              readOnly={!nuevo}
              onChange={(e) => {
                setIdEditado(true)
                set('id', e.target.value.toLowerCase())
              }}
              className="campo read-only:bg-crema-claro read-only:text-bordo/60"
            />
          </Campo>
          <Campo label="Categoría">
            <input required list="categorias" value={form.categoria} onChange={(e) => set('categoria', e.target.value)} className="campo" />
            <datalist id="categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo label="Etiquetas" ayuda="Separadas por coma. Ej: sin TACC, vegano">
            <input value={form.etiquetas} onChange={(e) => set('etiquetas', e.target.value)} className="campo" />
          </Campo>
        </div>

        <Campo label="Descripción">
          <textarea rows={4} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} className="campo" />
        </Campo>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Imagen</legend>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-linea bg-crema-claro">
              {imagenVista ? (
                <img src={imagenVista} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-bordo/50">Sin imagen</span>
              )}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => elegirArchivo(e.target.files?.[0])}
                className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-verde-claro file:px-4 file:py-2 file:font-bold file:text-bordo"
              />
              {imagenVista && (
                <button
                  type="button"
                  onClick={() => {
                    setArchivo(null)
                    set('imagen', '')
                  }}
                  className="self-start font-semibold text-bordo/70 hover:text-bordo"
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Presentaciones y precios</legend>
          <div className="grid gap-2">
            {form.variantes.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Presentación"
                  placeholder="Ej: 500 g"
                  value={v.etiqueta}
                  onChange={(e) => setVariante(i, { etiqueta: e.target.value })}
                  className="campo w-auto flex-1"
                />
                <input
                  aria-label="Precio"
                  placeholder="Precio"
                  inputMode="decimal"
                  value={v.precio}
                  onChange={(e) => setVariante(i, { precio: e.target.value })}
                  className="campo w-32"
                />
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <input type="checkbox" checked={v.disponible} onChange={(e) => setVariante(i, { disponible: e.target.checked })} />
                  Disponible
                </label>
                <button
                  type="button"
                  disabled={form.variantes.length === 1}
                  onClick={() => set('variantes', form.variantes.filter((_, j) => j !== i))}
                  className="px-2 text-sm font-semibold text-bordo/70 hover:text-bordo disabled:opacity-30"
                  aria-label={`Quitar ${v.etiqueta || 'presentación'}`}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set('variantes', [...form.variantes, { etiqueta: '', precio: '', disponible: true }])}
            className="mt-2 text-sm font-bold text-verde hover:underline"
          >
            + Agregar presentación
          </button>
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.disponible} onChange={(e) => set('disponible', e.target.checked)} />
            Disponible
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.enOferta} onChange={(e) => set('enOferta', e.target.checked)} />
            En oferta
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            Descuento %
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              disabled={!form.enOferta}
              value={form.descuento}
              onChange={(e) => set('descuento', e.target.value)}
              className="campo w-20 disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <Link to="/admin" className="rounded-full px-6 py-3 text-sm font-bold text-bordo/70 hover:text-bordo">
          Cancelar
        </Link>
        <button type="submit" disabled={guardando} className="btn-pill disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      <span className="mb-1 block">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs font-medium text-bordo/60">{ayuda}</span>}
    </label>
  )
}
