import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { price } from '../data/format'
import { slugify } from '../data/products'
import type { Product, Variante } from '../types/product'
import { guardarConImagen, guardarProducto, listarCategorias, listarEtiquetas, obtenerProducto, type CategoriaAdmin } from './api'
import EtiquetasInput from './EtiquetasInput'
import ImagenInput, { type ArchivoImagen } from './ImagenInput'
import { Aviso, BarraAcciones, Campo, Cargando, Ocupado } from './ui'

// Variantes en edición: el precio queda como texto hasta guardar
type VarianteForm = { etiqueta: string; precio: string; disponible: boolean }

type Form = {
  id: string
  nombre: string
  categoriaId: string
  descripcion: string
  etiquetas: string[]
  disponible: boolean
  enOferta: boolean
  descuento: string
  imagen: string
  variantes: VarianteForm[]
}

const VACIO: Form = {
  id: '',
  nombre: '',
  categoriaId: '',
  descripcion: '',
  etiquetas: [],
  disponible: true,
  enOferta: false,
  descuento: '0',
  imagen: '',
  variantes: [{ etiqueta: 'Único', precio: '', disponible: true }],
}

function aForm(p: Product): Form {
  return {
    id: p.id,
    nombre: p.nombre,
    categoriaId: p.categoriaId,
    descripcion: p.descripcion,
    etiquetas: p.etiquetas,
    disponible: p.disponible,
    enOferta: p.enOferta,
    descuento: String(p.descuento),
    imagen: p.imagen,
    variantes: p.variantes.map((v) => ({ etiqueta: v.etiqueta, precio: String(v.precio), disponible: v.disponible })),
  }
}

// Producto nuevo desde una fila de la lista de precios (Actualizar precios lo abre con estos parámetros).
// En una lista del proveedor viene el costo y el precio se calcula con la ganancia de la categoría elegida;
// en una lista con precios finales viene el precio.
type DesdeLista = { nombre: string; clave: string; costo: number | null; precio: number | null }

function leerDesdeLista(params: URLSearchParams): DesdeLista | null {
  const nombre = params.get('nombre')
  if (!nombre) return null
  const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null)
  return { nombre, clave: params.get('clave') ?? '', costo: num('costo'), precio: num('precio') }
}

// Las listas suelen venir en mayúsculas: "ALMENDRAS X KG" -> "Almendras x kg"
const sinMayusculas = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t)

function formDesdeLista(d: DesdeLista): Form {
  const nombre = sinMayusculas(d.nombre)
  return { ...VACIO, nombre, id: slugify(nombre), variantes: [{ ...VACIO.variantes[0], precio: d.precio === null ? '' : String(d.precio) }] }
}

// Valida y arma el producto. Devuelve el primer error encontrado.
function aProducto(f: Form, categorias: CategoriaAdmin[]): Product | string {
  const id = f.id.trim()
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return 'El id solo puede tener minúsculas, números y guiones.'
  if (!f.nombre.trim()) return 'Falta el nombre.'
  const categoria = categorias.find((c) => c.id === f.categoriaId)
  if (!categoria) return 'Elegí una categoría.'
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
    categoriaId: categoria.id,
    categoria: categoria.nombre,
    descripcion: f.descripcion.trim(),
    imagen: f.imagen,
    etiquetas: f.etiquetas,
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
  // La lista pasa sus filtros para volver a la misma página
  const volver = `/admin${(useLocation().state as { volver?: string } | null)?.volver ?? ''}`
  const [params] = useSearchParams()
  const [desdeLista] = useState(() => (nuevo ? leerDesdeLista(params) : null))
  const [form, setForm] = useState<Form | null>(nuevo ? (desdeLista ? formDesdeLista(desdeLista) : VACIO) : null)
  const [idEditado, setIdEditado] = useState(false)
  // Con costo del proveedor, el precio sigue a la categoría hasta que se escribe a mano
  const [precioEditado, setPrecioEditado] = useState(false)
  // Imagen guardada en la base: se borra del storage si se reemplaza o se quita
  const [imagenOriginal, setImagenOriginal] = useState('')
  const [archivo, setArchivo] = useState<ArchivoImagen | null>(null)
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([])
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch((e: Error) => setError(e.message))
    listarEtiquetas()
      .then(setEtiquetas)
      .catch((e: Error) => setError(e.message))
    if (nuevo) return
    obtenerProducto(idRuta)
      .then((p) => {
        if (!p) return setError('El producto no existe.')
        setForm(aForm(p))
        setImagenOriginal(p.imagen)
      })
      .catch((e: Error) => setError(e.message))
  }, [idRuta, nuevo])

  if (!form) return error ? <Aviso mensaje={error} /> : <Cargando tipo="formulario" />

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v })
  const setVariante = (i: number, v: Partial<VarianteForm>) =>
    set('variantes', form.variantes.map((x, j) => (j === i ? { ...x, ...v } : x)))

  function cambiarCategoria(categoriaId: string) {
    const margen = categorias.find((c) => c.id === categoriaId)?.margen
    const costo = desdeLista?.costo
    if (costo == null || margen === undefined || precioEditado) return set('categoriaId', categoriaId)
    const precio = String(Math.round(costo * (1 + margen / 100)))
    setForm({ ...form!, categoriaId, variantes: form!.variantes.map((v, i) => (i === 0 ? { ...v, precio } : v)) })
  }

  function cambiarNombre(nombre: string) {
    // Al crear, el id sigue al nombre hasta que se edita a mano
    setForm({ ...form!, nombre, id: nuevo && !idEditado ? slugify(nombre) : form!.id })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const producto = aProducto(form!, categorias)
    if (typeof producto === 'string') return setError(producto)
    setGuardando(true)
    setError(null)
    try {
      await guardarConImagen(`productos/${producto.id}`, archivo, producto.imagen, imagenOriginal, (imagen) =>
        guardarProducto({ ...producto, imagen }, nuevo, desdeLista?.costo != null ? { costo: desdeLista.costo, nombre: desdeLista.clave } : undefined),
      )
      // Abierto en otra pestaña desde Actualizar precios: se cierra y queda esa pantalla, con las listas cargadas
      if (desdeLista) window.close()
      navigate(volver)
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={volver} className="text-sm font-semibold text-verde hover:underline">
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

      <div className="grid grid-cols-1 gap-5 rounded-2xl border border-linea bg-white p-5 shadow-card sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <select required value={form.categoriaId} onChange={(e) => cambiarCategoria(e.target.value)} className="campo">
              <option value="" disabled>
                Elegí una categoría
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <EtiquetasInput
            seleccionadas={form.etiquetas}
            onChange={(t) => set('etiquetas', t)}
            disponibles={etiquetas}
            onDisponibles={setEtiquetas}
          />
        </div>

        <Campo label="Descripción">
          <textarea rows={4} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} className="campo" />
        </Campo>

        <ImagenInput
          imagen={form.imagen}
          archivo={archivo}
          onArchivo={(a) => {
            setError(null)
            setArchivo(a)
          }}
          onQuitar={() => set('imagen', '')}
          onError={setError}
        />

        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold">Presentaciones y precios</legend>
          {desdeLista && (
            <p className="mb-3 rounded-lg bg-verde-claro px-3 py-2 text-sm">
              De la lista: <strong>{desdeLista.nombre}</strong>
              {desdeLista.costo !== null && (
                <>
                  {' '}
                  · costo <strong>{price.format(desdeLista.costo)}</strong>. El precio se calcula con la ganancia de la categoría que elijas.
                </>
              )}
            </p>
          )}
          <div className="grid gap-2">
            {form.variantes.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-linea p-2 sm:border-0 sm:p-0">
                <input
                  aria-label="Presentación"
                  placeholder="Ej: 500 g"
                  value={v.etiqueta}
                  onChange={(e) => setVariante(i, { etiqueta: e.target.value })}
                  className="campo min-w-0 basis-full sm:basis-0 sm:flex-1"
                />
                <input
                  aria-label="Precio"
                  placeholder="Precio"
                  inputMode="decimal"
                  value={v.precio}
                  onChange={(e) => {
                    if (i === 0) setPrecioEditado(true)
                    setVariante(i, { precio: e.target.value })
                  }}
                  className="campo w-24 flex-1 sm:w-32 sm:flex-none"
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

      <Aviso mensaje={error} />

      <BarraAcciones>
        <Link to={volver} className="rounded-full px-6 py-3 text-sm font-bold text-bordo/70 hover:text-bordo">
          Cancelar
        </Link>
        <button type="submit" disabled={guardando} className="btn-pill disabled:opacity-60">
          <Ocupado activo={guardando} texto="Guardando…">
            Guardar
          </Ocupado>
        </button>
      </BarraAcciones>
    </form>
  )
}
