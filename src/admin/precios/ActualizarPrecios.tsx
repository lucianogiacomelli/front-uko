import { useEffect, useMemo, useState } from 'react'
import { price } from '../../data/format'
import { aplicarPrecios, cargarPrecios, type CategoriaPrecio, type ProductoPrecio, type VariantePrecio } from '../api'
import { Aviso } from '../ui'
import { firma, masParecidas, type Firma } from './coincidencias'
import { leerPdf, type FilaProveedor } from './pdf'

// Desde este puntaje se ofrece la fila más parecida para aceptar con un clic
const UMBRAL_SUGERENCIA = 0.7

type Fila = FilaProveedor & { i: number; firma: Firma }
type Item = { producto: ProductoPrecio; variante: VariantePrecio; nombre: string; firma: Firma }
type Origen = 'guardado' | 'exacto' | 'manual'
type Candidato = { i: number; puntaje: number }

const aNumero = (s: string) => Number(s.trim().replace(',', '.'))
const margenValido = (s: string) => s.trim() !== '' && Number.isFinite(aNumero(s)) && aNumero(s) >= 0

export default function ActualizarPrecios() {
  const [datos, setDatos] = useState<{ productos: ProductoPrecio[]; categorias: CategoriaPrecio[] } | null>(null)
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [archivo, setArchivo] = useState('')
  const [leyendo, setLeyendo] = useState(false)
  // Variante -> fila del PDF elegida, y cómo se eligió
  const [asignacion, setAsignacion] = useState<Record<string, { i: number; origen: Origen }>>({})
  const [sugerencias, setSugerencias] = useState<Record<string, Candidato[]>>({})
  // Márgenes en edición (texto). En productos, '' = usar el de la categoría
  const [margenCat, setMargenCat] = useState<Record<string, string>>({})
  const [margenProd, setMargenProd] = useState<Record<string, string>>({})
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [margenSeleccion, setMargenSeleccion] = useState('')
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [buscando, setBuscando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    cargarPrecios()
      .then((d) => {
        setDatos(d)
        setMargenCat(Object.fromEntries(d.categorias.map((c) => [c.id, String(c.margen)])))
        setMargenProd(Object.fromEntries(d.productos.map((p) => [p.id, p.margen === null ? '' : String(p.margen)])))
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(cargar, [])

  // Una entrada por variante. Con una sola presentación se compara el nombre del producto solo
  const items = useMemo<Item[]>(
    () =>
      (datos?.productos ?? []).flatMap((producto) =>
        producto.variantes.map((variante) => {
          const nombre = producto.variantes.length > 1 ? `${producto.nombre} ${variante.etiqueta}` : producto.nombre
          return { producto, variante, nombre, firma: firma(nombre) }
        }),
      ),
    [datos],
  )

  async function elegirPdf(file: File | undefined) {
    if (!file) return
    setLeyendo(true)
    setError(null)
    setAviso(null)
    try {
      const leidas = (await leerPdf(file)).map((f, i) => ({ ...f, i, firma: firma(f.nombre) }))
      if (leidas.length === 0) throw new Error('No se encontraron productos con precio en el PDF.')
      const asig: typeof asignacion = {}
      const sug: typeof sugerencias = {}
      for (const it of items) {
        // Primero el nombre guardado de una lista anterior, después el nombre igual al nuestro
        const guardada = it.variante.nombreProveedor ? leidas.find((f) => f.firma.clave === it.variante.nombreProveedor) : undefined
        const exacta = guardada ?? leidas.find((f) => f.firma.clave === it.firma.clave)
        if (exacta) asig[it.variante.id] = { i: exacta.i, origen: guardada ? 'guardado' : 'exacto' }
        else sug[it.variante.id] = masParecidas(it.firma, leidas).map(({ item, puntaje }) => ({ i: item.i, puntaje }))
      }
      setFilas(leidas)
      setArchivo(file.name)
      setAsignacion(asig)
      setSugerencias(sug)
      setSeleccion(new Set())
      setAbiertas(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el PDF.')
    } finally {
      setLeyendo(false)
    }
  }

  if (!datos) return error ? <Aviso mensaje={error} /> : <p>Cargando…</p>

  const margenDe = (p: ProductoPrecio) => (margenProd[p.id] !== '' ? margenProd[p.id] : margenCat[p.categoriaId])
  const precioNuevo = (costo: number, margen: string) => Math.round(costo * (1 + aNumero(margen) / 100))
  const mejorSugerencia = (id: string) => {
    const s = sugerencias[id]?.[0]
    return s && s.puntaje >= UMBRAL_SUGERENCIA ? s : null
  }

  const asignar = (varianteId: string, i: number) => {
    setAsignacion((a) => ({ ...a, [varianteId]: { i, origen: 'manual' } }))
    setBuscando(null)
  }
  const desasignar = (varianteId: string) =>
    setAsignacion((a) => {
      const { [varianteId]: _quitada, ...resto } = a
      return resto
    })

  function aceptarSugerencias() {
    const nuevas = { ...asignacion }
    for (const it of items) {
      const s = mejorSugerencia(it.variante.id)
      if (!nuevas[it.variante.id] && s) nuevas[it.variante.id] = { i: s.i, origen: 'manual' }
    }
    setAsignacion(nuevas)
  }

  function toggle<T>(set: Set<T>, valor: T) {
    const n = new Set(set)
    if (n.has(valor)) n.delete(valor)
    else n.add(valor)
    return n
  }

  function margenParaSeleccion(valor: string) {
    if (valor !== '' && !margenValido(valor)) return setError('El porcentaje de ganancia tiene que ser un número mayor o igual a 0.')
    setError(null)
    setMargenProd((m) => ({ ...m, ...Object.fromEntries([...seleccion].map((id) => [id, valor])) }))
    setSeleccion(new Set())
    setMargenSeleccion('')
  }

  async function guardar() {
    if (!datos || !filas) return
    const malos = [
      ...datos.categorias.filter((c) => !margenValido(margenCat[c.id])).map((c) => c.nombre),
      ...datos.productos.filter((p) => margenProd[p.id] !== '' && !margenValido(margenProd[p.id])).map((p) => p.nombre),
    ]
    if (malos.length) return setError(`Revisá el porcentaje de ganancia de: ${malos.slice(0, 5).join(', ')}.`)
    const variantes = items.flatMap((it) => {
      const a = asignacion[it.variante.id]
      if (!a) return []
      const fila = filas[a.i]
      return [{ id: it.variante.id, costo: fila.costo, precio: precioNuevo(fila.costo, margenDe(it.producto)), nombre_proveedor: fila.firma.clave }]
    })
    const categorias = datos.categorias
      .filter((c) => aNumero(margenCat[c.id]) !== c.margen)
      .map((c) => ({ id: c.id, margen: aNumero(margenCat[c.id]) }))
    const productos = datos.productos
      .filter((p) => (margenProd[p.id] === '' ? null : aNumero(margenProd[p.id])) !== p.margen)
      .map((p) => ({ id: p.id, margen: margenProd[p.id] === '' ? null : aNumero(margenProd[p.id]) }))
    setGuardando(true)
    setError(null)
    try {
      const n = await aplicarPrecios(variantes, categorias, productos)
      setAviso(`Listo: se actualizaron ${n} precios. Los nombres del proveedor quedaron guardados para la próxima lista.`)
      setFilas(null)
      setArchivo('')
      cargar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const asignadas = items.filter((it) => asignacion[it.variante.id])
  const conCambio = asignadas.filter((it) => {
    const fila = filas?.[asignacion[it.variante.id].i]
    return fila && precioNuevo(fila.costo, margenDe(it.producto)) !== it.variante.precio
  }).length
  const sugeridas = items.filter((it) => !asignacion[it.variante.id] && mejorSugerencia(it.variante.id)).length

  return (
    <section className={seleccion.size > 0 ? 'pb-24' : ''}>
      <h1 className="text-2xl font-extrabold tracking-tight">Actualizar precios</h1>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-bordo/70">
        Subí la lista del proveedor en PDF. Se buscan tus productos en la lista y el precio nuevo es el costo del proveedor más
        el % de ganancia de la categoría (o el propio del producto). Los precios se redondean a pesos.
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-linea bg-white p-4">
        <input
          type="file"
          accept="application/pdf"
          disabled={leyendo}
          onChange={(e) => {
            elegirPdf(e.target.files?.[0])
            e.target.value = ''
          }}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-verde file:px-5 file:py-2.5 file:font-bold file:text-crema"
          aria-label="PDF del proveedor"
        />
        {leyendo && <span className="text-sm font-semibold">Leyendo el PDF…</span>}
        {filas && (
          <span className="text-sm text-bordo/70">
            <strong>{archivo}</strong>: {filas.length} filas con precio
          </span>
        )}
      </div>

      <Aviso mensaje={error} />
      {aviso && <p className="mt-4 rounded-lg bg-verde-claro px-4 py-2 text-sm font-semibold">{aviso}</p>}

      {filas && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <strong>{asignadas.length}</strong> de {items.length} encontrados
            </span>
            <span>
              <strong>{conCambio}</strong> cambian de precio
            </span>
            {sugeridas > 0 && (
              <button type="button" onClick={aceptarSugerencias} className="font-bold text-verde hover:underline">
                Aceptar las {sugeridas} sugerencias
              </button>
            )}
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
              Ver solo los no encontrados
            </label>
          </div>

          <div className="mt-4 grid gap-3">
            {datos.categorias.map((cat) => {
              const deCat = items.filter((it) => it.producto.categoriaId === cat.id)
              const visibles = soloPendientes ? deCat.filter((it) => !asignacion[it.variante.id]) : deCat
              if (visibles.length === 0) return null
              const encontrados = deCat.filter((it) => asignacion[it.variante.id]).length
              const abierta = abiertas.has(cat.id)
              return (
                <div key={cat.id} className="overflow-hidden rounded-2xl border border-linea bg-white">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setAbiertas((s) => toggle(s, cat.id))}
                      aria-expanded={abierta}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left font-extrabold"
                    >
                      <span aria-hidden className={`transition ${abierta ? 'rotate-90' : ''}`}>
                        ▸
                      </span>
                      {cat.nombre}
                      <span className="text-xs font-semibold text-bordo/60">
                        {encontrados}/{deCat.length} encontrados
                      </span>
                    </button>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      Ganancia
                      <input
                        inputMode="decimal"
                        value={margenCat[cat.id]}
                        onChange={(e) => setMargenCat((m) => ({ ...m, [cat.id]: e.target.value }))}
                        className={`campo w-20 ${margenValido(margenCat[cat.id]) ? '' : 'border-red-500'}`}
                        aria-label={`Ganancia de ${cat.nombre}`}
                      />
                      %
                    </label>
                  </div>

                  {abierta && (
                    <ul className="divide-y divide-linea border-t border-linea">
                      {visibles.map((it) => {
                        const a = asignacion[it.variante.id]
                        const fila = a ? filas[a.i] : null
                        const margen = margenDe(it.producto)
                        const nuevo = fila && margenValido(margen) ? precioNuevo(fila.costo, margen) : null
                        const cambio = nuevo !== null && it.variante.precio > 0 ? ((nuevo - it.variante.precio) / it.variante.precio) * 100 : 0
                        const sug = mejorSugerencia(it.variante.id)
                        return (
                          <li key={it.variante.id} className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <label className="flex min-w-0 flex-1 basis-60 items-center gap-2 font-bold">
                                <input
                                  type="checkbox"
                                  checked={seleccion.has(it.producto.id)}
                                  onChange={() => setSeleccion((s) => toggle(s, it.producto.id))}
                                  aria-label={`Seleccionar ${it.producto.nombre}`}
                                />
                                <span className="min-w-0">
                                  {it.nombre}
                                  {margenProd[it.producto.id] !== '' && (
                                    <span className="ml-2 rounded-full bg-verde-claro px-2 py-0.5 text-xs">
                                      {margenProd[it.producto.id]}% propio
                                    </span>
                                  )}
                                </span>
                              </label>

                              <div className="min-w-0 flex-1 basis-60 text-bordo/80">
                                {fila ? (
                                  <span>
                                    {fila.nombre} · <strong>{price.format(fila.costo)}</strong>
                                    {a.origen !== 'manual' && <span className="text-xs text-bordo/50"> ({a.origen === 'guardado' ? 'recordado' : 'igual'})</span>}
                                    <button type="button" onClick={() => desasignar(it.variante.id)} className="ml-2 text-xs font-semibold text-bordo/60 hover:text-bordo">
                                      Quitar
                                    </button>
                                  </span>
                                ) : sug ? (
                                  <span>
                                    ¿Es <strong>{filas[sug.i].nombre}</strong>?{' '}
                                    <button type="button" onClick={() => asignar(it.variante.id, sug.i)} className="font-bold text-verde hover:underline">
                                      Sí
                                    </button>
                                  </span>
                                ) : (
                                  <span className="font-semibold text-red-700">No encontrado</span>
                                )}
                                {!fila && (
                                  <button
                                    type="button"
                                    onClick={() => setBuscando(buscando === it.variante.id ? null : it.variante.id)}
                                    className="ml-2 font-semibold text-verde hover:underline"
                                  >
                                    {buscando === it.variante.id ? 'Cerrar' : 'Buscar'}
                                  </button>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-2 tabular-nums">
                                <span className="text-bordo/60">{price.format(it.variante.precio)}</span>
                                {nuevo !== null && (
                                  <>
                                    <span aria-hidden>→</span>
                                    <strong>{price.format(nuevo)}</strong>
                                    {Math.round(cambio) !== 0 && (
                                      <span className={`text-xs font-bold ${cambio > 0 ? 'text-red-700' : 'text-verde'}`}>
                                        {cambio > 0 ? '+' : ''}
                                        {cambio.toFixed(0)}%
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {buscando === it.variante.id && (
                              <Buscador filas={filas} sugeridas={sugerencias[it.variante.id] ?? []} onElegir={(i) => asignar(it.variante.id, i)} />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" disabled={guardando || asignadas.length === 0} onClick={guardar} className="btn-pill disabled:opacity-60">
              {guardando ? 'Guardando…' : `Guardar ${asignadas.length} precios`}
            </button>
          </div>
        </>
      )}

      {seleccion.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-white shadow-[0_-8px_24px_rgba(71,14,18,0.08)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <strong>
              {seleccion.size} {seleccion.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
            </strong>
            <label className="flex items-center gap-2 font-semibold">
              Ganancia
              <input inputMode="decimal" value={margenSeleccion} onChange={(e) => setMargenSeleccion(e.target.value)} className="campo w-20" />%
            </label>
            <button type="button" onClick={() => margenParaSeleccion(margenSeleccion)} className="btn-pill !py-2">
              Aplicar
            </button>
            <button type="button" onClick={() => margenParaSeleccion('')} className="font-semibold text-verde hover:underline">
              Usar el de su categoría
            </button>
            <button type="button" onClick={() => setSeleccion(new Set())} className="ml-auto font-semibold text-bordo/70 hover:text-bordo">
              Deseleccionar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// Filas del PDF para elegir a mano: las más parecidas, o las que coinciden con lo que se escribe
function Buscador({ filas, sugeridas, onElegir }: { filas: Fila[]; sugeridas: Candidato[]; onElegir: (i: number) => void }) {
  const [texto, setTexto] = useState('')
  const opciones = texto.trim()
    ? masParecidas(firma(texto), filas, 8).map(({ item, puntaje }) => ({ i: item.i, puntaje }))
    : sugeridas
  return (
    <div className="mt-3 rounded-xl border border-linea bg-crema-claro p-3">
      <input
        type="search"
        autoFocus
        placeholder="Buscar en la lista del proveedor"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="campo"
      />
      <ul className="mt-2 grid gap-1">
        {opciones.map(({ i }) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onElegir(i)}
              className="flex w-full justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-verde-claro"
            >
              <span>{filas[i].nombre}</span>
              <strong className="tabular-nums">{price.format(filas[i].costo)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
