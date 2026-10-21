import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { claveEtiqueta, crearEtiqueta } from './api'
import { Spinner } from './ui'

type Props = {
  seleccionadas: string[]
  onChange: (etiquetas: string[]) => void
  // Etiquetas guardadas en la base; al crear una nueva se suma acá
  disponibles: string[]
  onDisponibles: (etiquetas: string[]) => void
}

const MAX_SUGERENCIAS = 8

// Elegir una etiqueta guardada o crear una nueva. Crear una que ya existe da error y pide seleccionarla.
export default function EtiquetasInput({ seleccionadas, onChange, disponibles, onDisponibles }: Props) {
  const idLista = useId()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  // Sugerencia marcada con las flechas (-1 = ninguna: Enter crea la etiqueta escrita)
  const [activa, setActiva] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const chips = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  // Al sumar una etiqueta, los chips bajan hasta la última para que se vea (al abrir el producto quedan arriba)
  const cantidadPrevia = useRef(seleccionadas.length)
  useEffect(() => {
    if (seleccionadas.length > cantidadPrevia.current) chips.current?.scrollTo({ top: chips.current.scrollHeight })
    cantidadPrevia.current = seleccionadas.length
  }, [seleccionadas.length])

  const clave = claveEtiqueta(texto)
  const elegidas = new Set(seleccionadas.map(claveEtiqueta))
  const existente = clave ? disponibles.find((e) => claveEtiqueta(e) === clave) : undefined
  const sugerencias = disponibles
    .filter((e) => !elegidas.has(claveEtiqueta(e)) && claveEtiqueta(e).includes(clave))
    .slice(0, MAX_SUGERENCIAS)
  const puedeCrear = clave !== '' && !existente

  function cambiarTexto(valor: string) {
    setTexto(valor)
    setAbierto(true)
    setActiva(-1)
    setError(null)
  }

  function seleccionar(etiqueta: string) {
    if (!elegidas.has(claveEtiqueta(etiqueta))) onChange([...seleccionadas, etiqueta])
    setTexto('')
    setActiva(-1)
    setError(null)
  }

  async function crear() {
    const nombre = texto.trim().replace(/\s+/g, ' ')
    if (!nombre || creando) return
    if (existente) {
      setAbierto(true)
      return setError(
        elegidas.has(clave)
          ? `La etiqueta "${existente}" ya está en este producto.`
          : `La etiqueta "${existente}" ya existe. Seleccionala de la lista.`,
      )
    }
    setCreando(true)
    try {
      await crearEtiqueta(nombre)
      onDisponibles([...disponibles, nombre].sort((a, b) => a.localeCompare(b, 'es')))
      seleccionar(nombre)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreando(false)
    }
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      // Enter no envía el formulario del producto
      e.preventDefault()
      if (activa >= 0 && sugerencias[activa]) seleccionar(sugerencias[activa])
      else void crear()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setActiva((i) => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiva((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setAbierto(false)
    } else if (e.key === 'Backspace' && texto === '' && seleccionadas.length > 0) {
      onChange(seleccionadas.slice(0, -1))
    }
  }

  const mostrarLista = abierto && (sugerencias.length > 0 || puedeCrear)

  return (
    <div className="text-sm font-semibold">
      <label htmlFor={`${idLista}-input`} className="mb-1 block">
        Etiquetas
      </label>

      <div className="relative">
        {/* Chips arriba (con muchas etiquetas dejan de crecer y scrollean) y el buscador siempre visible abajo */}
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              input.current?.focus()
            }
          }}
          className="cursor-text rounded-lg border border-linea bg-white focus-within:border-verde focus-within:ring-2 focus-within:ring-verde/30"
        >
          {seleccionadas.length > 0 && (
            <div ref={chips} className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto border-b border-linea px-2 py-1.5">
              {seleccionadas.map((t) => (
                <span
                  key={t}
                  className="flex max-w-full items-center gap-0.5 rounded-full bg-verde/15 py-0.5 pr-0.5 pl-2.5 text-xs font-bold text-verde-oscuro"
                >
                  <span className="truncate" title={t}>
                    {t}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(seleccionadas.filter((x) => x !== t))}
                    aria-label={`Quitar etiqueta ${t}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm leading-none hover:bg-verde/20"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              ref={input}
              id={`${idLista}-input`}
              value={texto}
              onChange={(e) => cambiarTexto(e.target.value)}
              onFocus={() => setAbierto(true)}
              onBlur={() => setAbierto(false)}
              onKeyDown={teclas}
              placeholder={seleccionadas.length ? 'Agregar otra…' : 'Buscá o escribí una nueva'}
              role="combobox"
              aria-expanded={mostrarLista}
              aria-controls={idLista}
              aria-autocomplete="list"
              aria-activedescendant={activa >= 0 ? `${idLista}-${activa}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-bordo outline-none"
            />
            {creando && <Spinner className="h-4 w-4 text-verde" />}
          </div>
        </div>

        {/* El aviso va antes de la lista para que las sugerencias no lo tapen */}
        {error ? (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
            {error}
          </p>
        ) : (
          <span className="mt-1 block text-xs font-medium text-bordo/60">
            Elegí una de la lista o escribí una nueva y tocá Enter.
          </span>
        )}

        {mostrarLista && (
          <ul
            id={idLista}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-linea bg-white py-1 shadow-card"
          >
            {sugerencias.map((t, i) => (
              <li
                key={t}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === activa}
                // mousedown en vez de click: el input no pierde el foco antes de elegir
                onMouseDown={(e) => {
                  e.preventDefault()
                  seleccionar(t)
                }}
                onMouseEnter={() => setActiva(i)}
                className={`cursor-pointer px-3 py-2 font-medium ${i === activa ? 'bg-crema' : ''} ${
                  existente === t ? 'font-bold text-verde' : ''
                }`}
              >
                {t}
              </li>
            ))}
            {puedeCrear && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault()
                  void crear()
                }}
                className="cursor-pointer border-t border-linea px-3 py-2 font-bold text-verde hover:bg-crema"
              >
                + Crear etiqueta "{texto.trim()}"
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
