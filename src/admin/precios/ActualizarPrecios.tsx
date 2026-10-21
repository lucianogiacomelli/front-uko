import { useEffect, useMemo, useState } from 'react'
import { price } from '../../data/format'
import { aplicarPrecios, cargarPrecios, type CategoriaPrecio, type ProductoPrecio, type VariantePrecio } from '../api'
import { Aviso, Cargando, Ocupado, Spinner } from '../ui'
import { firma, masParecidas, normalizar, type Firma } from './coincidencias'
import { exportarListaDocx, exportarListaPdf } from './exportarLista'
import { leerLista, type FilaProveedor } from './leerLista'

// Desde este puntaje se ofrece la fila más parecida para aceptar con un clic
const UMBRAL_SUGERENCIA = 0.7

// i = posición en la lista de filas de todos los PDFs cargados
type Fila = FilaProveedor & { i: number; firma: Firma; archivo: string; seccionClave: string }
// categoria: nombre normalizado de la categoría, para desempatar productos con el mismo nombre
type Item = { producto: ProductoPrecio; variante: VariantePrecio; nombre: string; firma: Firma; categoria: string }
type Origen = 'guardado' | 'exacto' | 'manual'
type Asignacion = Record<string, { i: number; origen: Origen }>
type Candidato = { i: number; puntaje: number }

// Busca cada variante en las filas de todos los PDFs. Conserva las asignaciones previas;
// si no hay, prueba el nombre recordado de una lista anterior y después el nombre igual al nuestro.
// Las que siguen sin fila reciben las más parecidas como sugerencia.
function emparejar(items: Item[], filas: Fila[], previa: Asignacion) {
  const asignacion: Asignacion = {}
  const sugerencias: Record<string, Candidato[]> = {}
  for (const it of items) {
    const id = it.variante.id
    if (previa[id]) {
      asignacion[id] = previa[id]
      continue
    }
    const guardadas = it.variante.nombreProveedor ? filas.filter((f) => f.firma.clave === it.variante.nombreProveedor) : []
    const iguales = guardadas.length ? guardadas : filas.filter((f) => f.firma.clave === it.firma.clave)
    // Si el mismo nombre aparece varias veces (en distintas categorías), gana la fila bajo el título de su categoría
    const exacta = iguales.find((f) => f.seccionClave === it.categoria) ?? iguales[0]
    if (exacta) asignacion[id] = { i: exacta.i, origen: guardadas.length ? 'guardado' : 'exacto' }
    else sugerencias[id] = masParecidas(it.firma, filas).map(({ item, puntaje }) => ({ i: item.i, puntaje }))
  }
  return { asignacion, sugerencias }
}

// proveedor: el PDF trae costos y se les suma la ganancia. final: el PDF ya trae el precio de venta
type Modo = 'proveedor' | 'final'

const aNumero = (s: string) => Number(s.trim().replace(',', '.'))
const margenValido = (s: string) => s.trim() !== '' && Number.isFinite(aNumero(s)) && aNumero(s) >= 0

export default function ActualizarPrecios() {
  const [datos, setDatos] = useState<{ productos: ProductoPrecio[]; categorias: CategoriaPrecio[] } | null>(null)
  const [modo, setModo] = useState<Modo>('proveedor')
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  // Variante -> fila del PDF elegida, y cómo se eligió
  const [asignacion, setAsignacion] = useState<Asignacion>({})
  const [sugerencias, setSugerencias] = useState<Record<string, Candidato[]>>({})
  // Márgenes en edición (texto). En productos, '' = usar el de la categoría
  const [margenCat, setMargenCat] = useState<Record<string, string>>({})
  const [margenProd, setMargenProd] = useState<Record<string, string>>({})
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [margenSeleccion, setMargenSeleccion] = useState('')
  const [margenLista, setMargenLista] = useState('')
  // PDF al que se aplica la ganancia general ('' = todos)
  const [archivoMargen, setArchivoMargen] = useState('')
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [buscando, setBuscando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Formato que se está generando para descargar
  const [exportando, setExportando] = useState<'pdf' | 'docx' | null>(null)

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
  const items = useMemo<Item[]>(() => {
    const categorias = new Map((datos?.categorias ?? []).map((c) => [c.id, normalizar(c.nombre)]))
    return (datos?.productos ?? []).flatMap((producto) =>
      producto.variantes.map((variante) => {
        const nombre = producto.variantes.length > 1 ? `${producto.nombre} ${variante.etiqueta}` : producto.nombre
        return { producto, variante, nombre, firma: firma(nombre), categoria: categorias.get(producto.categoriaId) ?? '' }
      }),
    )
  }, [datos])

  // Agrega PDFs a los ya cargados: un producto puede estar en la lista de cualquier proveedor
  async function agregarPdfs(archivos: File[]) {
    const actuales = filas ?? []
    const nuevos = archivos.filter((f) => !actuales.some((x) => x.archivo === f.name))
    if (nuevos.length === 0) return
    setLeyendo(true)
    setError(null)
    setAviso(null)
    try {
      const todas = [...actuales]
      const vacios: string[] = []
      for (const file of nuevos) {
        const leidas = await leerLista(file)
        if (leidas.length === 0) vacios.push(file.name)
        for (const f of leidas) {
          todas.push({ ...f, i: todas.length, firma: firma(f.nombre), archivo: file.name, seccionClave: normalizar(f.seccion) })
        }
      }
      if (vacios.length) setError(`No se encontraron productos con precio en: ${vacios.join(', ')}.`)
      if (todas.length === 0) return
      const r = emparejar(items, todas, asignacion)
      setFilas(todas)
      setAsignacion(r.asignacion)
      setSugerencias(r.sugerencias)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el PDF.')
    } finally {
      setLeyendo(false)
    }
  }

  // Saca un PDF: sus filas dejan de estar asignadas y se vuelve a buscar en los que quedan
  function quitarPdf(nombre: string) {
    if (!filas) return
    const quedan = filas.filter((f) => f.archivo !== nombre)
    const nuevoIndice = new Map(quedan.map((f, i) => [f.i, i]))
    const previa: Asignacion = {}
    for (const [id, a] of Object.entries(asignacion)) {
      const i = nuevoIndice.get(a.i)
      if (i !== undefined) previa[id] = { ...a, i }
    }
    if (archivoMargen === nombre) setArchivoMargen('')
    if (quedan.length === 0) {
      setFilas(null)
      setAsignacion({})
      setSugerencias({})
      return
    }
    const renumeradas = quedan.map((f, i) => ({ ...f, i }))
    const r = emparejar(items, renumeradas, previa)
    setFilas(renumeradas)
    setAsignacion(r.asignacion)
    setSugerencias(r.sugerencias)
  }

  if (!datos) return error ? <Aviso mensaje={error} /> : <Cargando filas={6} />

  const margenDe = (p: ProductoPrecio) => (margenProd[p.id] !== '' ? margenProd[p.id] : margenCat[p.categoriaId])
  const final = modo === 'final'
  const precioNuevo = (costo: number, margen: string) => Math.round(costo * (1 + aNumero(margen) / 100))
  // Precio que quedaría con la fila asignada (null si el % de ganancia no es válido)
  const calcular = (it: Item, fila: Fila) => {
    if (final) return fila.precio
    const margen = margenDe(it.producto)
    return margenValido(margen) ? precioNuevo(fila.precio, margen) : null
  }

  // Cambiar de modo descarta los PDFs cargados: una lista de costos no sirve como lista final ni al revés
  function cambiarModo(m: Modo) {
    if (m === modo) return
    setModo(m)
    setFilas(null)
    setAsignacion({})
    setSugerencias({})
    setSeleccion(new Set())
    setArchivoMargen('')
    setError(null)
    setAviso(null)
  }
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

  // Mismo % para todas las categorías que tienen productos encontrados en este PDF.
  // Los productos con % propio lo conservan.
  function margenParaLista() {
    if (!margenValido(margenLista)) return setError('El porcentaje de ganancia tiene que ser un número mayor o igual a 0.')
    setError(null)
    setMargenCat((m) => ({ ...m, ...Object.fromEntries(categoriasDeLista.map((id) => [id, margenLista])) }))
    setMargenLista('')
  }

  async function exportar(formato: 'pdf' | 'docx') {
    setExportando(formato)
    setError(null)
    try {
      await (formato === 'pdf' ? exportarListaPdf() : exportarListaDocx())
    } catch {
      setError(`No se pudo generar la lista de precios en ${formato === 'pdf' ? 'PDF' : 'Word'}.`)
    } finally {
      setExportando(null)
    }
  }

  async function guardar() {
    if (!datos || !filas) return
    const malos = final
      ? []
      : [
          ...datos.categorias.filter((c) => !margenValido(margenCat[c.id])).map((c) => c.nombre),
          ...datos.productos.filter((p) => margenProd[p.id] !== '' && !margenValido(margenProd[p.id])).map((p) => p.nombre),
        ]
    if (malos.length) return setError(`Revisá el porcentaje de ganancia de: ${malos.slice(0, 5).join(', ')}.`)
    const variantes = items.flatMap((it) => {
      const a = asignacion[it.variante.id]
      if (!a) return []
      const fila = filas[a.i]
      // Con precios finales solo cambia el precio: el costo y el nombre del proveedor quedan como estaban
      return [
        final
          ? { id: it.variante.id, costo: it.variante.costo, precio: fila.precio, nombre_proveedor: it.variante.nombreProveedor }
          : { id: it.variante.id, costo: fila.precio, precio: precioNuevo(fila.precio, margenDe(it.producto)), nombre_proveedor: fila.firma.clave },
      ]
    })
    const categorias = final ? [] : datos.categorias
      .filter((c) => aNumero(margenCat[c.id]) !== c.margen)
      .map((c) => ({ id: c.id, margen: aNumero(margenCat[c.id]) }))
    const productos = final ? [] : datos.productos
      .filter((p) => (margenProd[p.id] === '' ? null : aNumero(margenProd[p.id])) !== p.margen)
      .map((p) => ({ id: p.id, margen: margenProd[p.id] === '' ? null : aNumero(margenProd[p.id]) }))
    setGuardando(true)
    setError(null)
    try {
      const n = await aplicarPrecios(variantes, categorias, productos)
      setAviso(
        final
          ? `Listo: se actualizaron ${n} precios.`
          : `Listo: se actualizaron ${n} precios. Los nombres del proveedor quedaron guardados para la próxima lista.`,
      )
      setFilas(null)
      setAsignacion({})
      setSugerencias({})
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
    const nuevo = fila ? calcular(it, fila) : null
    return nuevo !== null && nuevo !== it.variante.precio
  }).length
  const archivoDe = (it: Item) => filas![asignacion[it.variante.id].i].archivo
  const archivos = [...new Set((filas ?? []).map((f) => f.archivo))].map((nombre) => ({
    nombre,
    filas: filas!.filter((f) => f.archivo === nombre).length,
    usadas: asignadas.filter((it) => archivoDe(it) === nombre).length,
  }))
  const categoriasDeLista = [
    ...new Set(asignadas.filter((it) => !archivoMargen || archivoDe(it) === archivoMargen).map((it) => it.producto.categoriaId)),
  ]
  const sugeridas = items.filter((it) => !asignacion[it.variante.id] && mejorSugerencia(it.variante.id)).length

  return (
    <section className={seleccion.size > 0 ? 'pb-24' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Actualizar precios</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="text-bordo/70">Descargar lista de precios:</span>
          {(
            [
              ['pdf', 'PDF'],
              ['docx', 'Word (editable)'],
            ] as const
          ).map(([formato, label]) => (
            <button
              key={formato}
              type="button"
              onClick={() => exportar(formato)}
              disabled={exportando !== null}
              className="rounded-full border border-verde px-4 py-2 text-verde transition hover:bg-verde-claro disabled:opacity-60"
            >
              <Ocupado activo={exportando === formato} texto="Generando…">
                {label}
              </Ocupado>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-linea bg-white p-1 text-sm font-bold sm:w-fit sm:flex-row sm:rounded-full" role="tablist">
        {(
          [
            ['proveedor', 'Lista del proveedor (costo + ganancia)'],
            ['final', 'Lista con precios finales'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => cambiarModo(m)}
            className={`rounded-xl px-4 py-2 transition-colors sm:rounded-full ${modo === m ? 'bg-verde text-crema' : 'text-bordo/70 hover:text-bordo'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 mb-5 max-w-2xl text-sm text-bordo/70">
        {final
          ? 'Subí una lista con los precios de venta ya calculados: la que descargás acá (en PDF o Word, editada o no) o la lista impresa del local. Se buscan tus productos y se guarda el precio tal como viene, sin sumar ganancia.'
          : 'Subí la lista del proveedor en PDF. Se buscan tus productos en la lista y el precio nuevo es el costo del proveedor más el % de ganancia de la categoría (o el propio del producto). Los precios se redondean a pesos.'}
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-linea bg-white p-4">
        <input
          type="file"
          accept={final ? '.pdf,.docx' : '.pdf'}
          multiple
          disabled={leyendo}
          onChange={(e) => {
            agregarPdfs([...(e.target.files ?? [])])
            e.target.value = ''
          }}
          className="max-w-full text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-verde file:px-5 file:py-2.5 file:font-bold file:text-crema file:transition-colors hover:file:bg-verde-oscuro"
          aria-label={final ? 'Listas con precios finales' : 'PDFs de los proveedores'}
        />
        <span className="text-sm text-bordo/60">
          {final ? 'PDF o Word (.docx). ' : ''}Podés elegir varios archivos juntos o ir agregándolos.
        </span>
        {leyendo && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-verde">
            <Spinner />
            Leyendo y buscando tus productos…
          </span>
        )}
        {archivos.length > 0 && (
          <ul className="flex w-full flex-wrap gap-2">
            {archivos.map((a) => (
              <li key={a.nombre} className="flex items-center gap-2 rounded-full bg-verde-claro px-3 py-1.5 text-sm">
                <strong>{a.nombre}</strong>
                <span className="text-bordo/70">
                  {a.filas} filas · {a.usadas} usadas
                </span>
                <button
                  type="button"
                  onClick={() => quitarPdf(a.nombre)}
                  className="font-bold text-bordo/60 hover:text-bordo"
                  aria-label={`Quitar ${a.nombre}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Aviso mensaje={error} />
      {aviso && <p className="mt-4 rounded-lg bg-verde-claro px-4 py-2 text-sm font-semibold">{aviso}</p>}

      {filas && (
        <>
          {!final && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-linea bg-white p-4 text-sm">
              <label className="flex flex-wrap items-center gap-2 font-semibold">
                Ganancia para
                {archivos.length > 1 ? (
                  <select value={archivoMargen} onChange={(e) => setArchivoMargen(e.target.value)} className="campo w-auto" aria-label="PDF">
                    <option value="">todos los PDFs</option>
                    {archivos.map((a) => (
                      <option key={a.nombre} value={a.nombre}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  'toda la lista'
                )}
                <input inputMode="decimal" value={margenLista} onChange={(e) => setMargenLista(e.target.value)} className="campo w-20" />%
              </label>
              <button type="button" onClick={margenParaLista} disabled={categoriasDeLista.length === 0} className="btn-pill !py-2 disabled:opacity-60">
                Aplicar
              </button>
              <span className="text-bordo/60">
                Se aplica a las {categoriasDeLista.length} categorías con productos encontrados. Los productos con % propio lo mantienen.
              </span>
            </div>
          )}

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
                    {!final && (
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
                    )}
                  </div>

                  {abierta && (
                    <ul className="divide-y divide-linea border-t border-linea">
                      {visibles.map((it) => {
                        const a = asignacion[it.variante.id]
                        const fila = a ? filas[a.i] : null
                        const nuevo = fila ? calcular(it, fila) : null
                        const cambio = nuevo !== null && it.variante.precio > 0 ? ((nuevo - it.variante.precio) / it.variante.precio) * 100 : 0
                        const sug = mejorSugerencia(it.variante.id)
                        return (
                          <li key={it.variante.id} className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <label className="flex min-w-0 flex-1 basis-60 items-center gap-2 font-bold">
                                {!final && (
                                  <input
                                    type="checkbox"
                                    checked={seleccion.has(it.producto.id)}
                                    onChange={() => setSeleccion((s) => toggle(s, it.producto.id))}
                                    aria-label={`Seleccionar ${it.producto.nombre}`}
                                  />
                                )}
                                <span className="min-w-0">
                                  {it.nombre}
                                  {!final && margenProd[it.producto.id] !== '' && (
                                    <span className="ml-2 rounded-full bg-verde-claro px-2 py-0.5 text-xs">
                                      {margenProd[it.producto.id]}% propio
                                    </span>
                                  )}
                                </span>
                              </label>

                              <div className="min-w-0 flex-1 basis-60 text-bordo/80">
                                {fila ? (
                                  <span>
                                    {fila.nombre} · <strong>{price.format(fila.precio)}</strong>
                                    {archivos.length > 1 && <span className="text-xs text-bordo/50"> · {fila.archivo}</span>}
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
              <Ocupado activo={guardando} texto="Guardando…">
                Guardar {asignadas.length} precios
              </Ocupado>
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
              <span>
                {filas[i].nombre}
                <span className="ml-2 text-xs text-bordo/50">{filas[i].archivo}</span>
              </span>
              <strong className="tabular-nums">{price.format(filas[i].precio)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
